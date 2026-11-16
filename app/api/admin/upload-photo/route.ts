import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { verifyMasterAccess } from "@/lib/master-auth";

export async function POST(request: Request) {
  try {
    const auth = await verifyMasterAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso negado: perfil Master obrigatório." },
        { status: auth.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetBucket = searchParams.get("bucket") || (searchParams.get("type") === "mc" ? "gestoes" : "atividades");
    const contentTypeHeader = request.headers.get("content-type") || "";

    let buffer: Buffer;
    let extension = "jpg";
    let mimeType = "image/jpeg";
    let originalName = "upload";

    if (contentTypeHeader.includes("application/json")) {
      const body = await request.json();
      const { base64Data, filename, bucket } = body;

      if (!base64Data) {
        return NextResponse.json({ error: "Dados da imagem não fornecidos." }, { status: 400 });
      }

      if (bucket) {
        // Permite especificar bucket no payload ('atividades' ou 'gestoes')
      }

      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        if (mimeType.includes("png")) extension = "png";
        else if (mimeType.includes("webp")) extension = "webp";
        else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg";
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(base64Data, "base64");
      }

      if (filename) originalName = filename;
    } else if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      extension = path.extname(file.name).replace(".", "") || "jpg";
      mimeType = file.type || "image/jpeg";
      originalName = file.name;
    } else {
      return NextResponse.json({ error: "Formato de requisição não suportado." }, { status: 400 });
    }

    const randomSuffix = crypto.randomBytes(6).toString("hex");
    const cleanBase = originalName.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 30);
    const finalFileName = `${cleanBase}-${Date.now()}-${randomSuffix}.${extension}`;

    // 1. Prioridade Arquitetural: Supabase Storage Institucional (atividades ou gestoes)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const storagePath = `${finalFileName}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from(targetBucket)
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadError) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${targetBucket}/${storagePath}`;
          return NextResponse.json({
            success: true,
            url: publicUrl,
            storage: "supabase",
            bucket: targetBucket,
          });
        } else {
          console.warn("Aviso ao persistir no Supabase Storage:", uploadError.message);
        }
      } catch (err) {
        console.warn("Exceção na integração com Supabase Storage:", err);
      }
    }

    // 2. Fallback de Segurança: Armazenamento Local em public/uploads/
    const uploadsDir = path.resolve(process.cwd(), "public/uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localFilePath = path.join(uploadsDir, finalFileName);
    fs.writeFileSync(localFilePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${finalFileName}`,
      storage: "local",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro no upload da imagem";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
