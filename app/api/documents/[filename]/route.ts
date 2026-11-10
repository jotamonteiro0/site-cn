import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function sanitize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";

    const decoded = decodeURIComponent(filename);
    const safeName = path.basename(decoded);
    const finalFilename = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
    const dispositionType = isDownload ? "attachment" : "inline";

    // 1. Check local filesystem first (development or self-hosted)
    const targetPath = path.join(process.cwd(), "exemplo", finalFilename);
    if (fs.existsSync(targetPath)) {
      const fileBuffer = fs.readFileSync(targetPath);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(finalFilename)}"`,
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
      });
    }

    // 2. Fallback to Supabase Storage (Vercel Serverless Production)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const sanitizedName = sanitize(finalFilename);

      const candidateKeys = [
        `acervo/${sanitizedName}`,
        `acervo/${finalFilename}`,
        sanitizedName,
        finalFilename,
      ];

      for (const key of candidateKeys) {
        const { data, error } = await supabase.storage.from("documentos").download(key);
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(finalFilename)}"`,
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
          });
        }
      }

      // Fuzzy lookup if exact match wasn't found
      const { data: listData } = await supabase.storage.from("documentos").list("acervo", { limit: 100 });
      if (listData && listData.length > 0) {
        const normTarget = sanitizedName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const match = listData.find((item) => {
          const itemNorm = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          return itemNorm === normTarget || itemNorm.includes(normTarget) || normTarget.includes(itemNorm);
        });

        if (match) {
          const { data: matchedData, error: matchErr } = await supabase.storage
            .from("documentos")
            .download(`acervo/${match.name}`);
          if (!matchErr && matchedData) {
            const arrayBuffer = await matchedData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return new NextResponse(buffer, {
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(finalFilename)}"`,
                "Cache-Control": "public, max-age=3600, s-maxage=86400",
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  } catch (err) {
    console.error("Erro ao servir documento PDF:", err);
    return NextResponse.json({ error: "Falha ao ler documento." }, { status: 500 });
  }
}
