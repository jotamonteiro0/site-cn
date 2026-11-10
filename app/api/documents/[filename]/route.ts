import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
    const sanitizedName = sanitize(finalFilename);
    const dispositionType = isDownload ? "attachment" : "inline";

    // 1. Direct Static Resolution from local filesystem (instantaneous)
    const localCandidates = [
      path.join(process.cwd(), "public", "documentos", "gestao", finalFilename),
      path.join(process.cwd(), "public", "documentos", "gestao", sanitizedName),
      path.join(process.cwd(), "public", "documentos", "atas", finalFilename),
      path.join(process.cwd(), "public", "documentos", "atas", sanitizedName),
      path.join(process.cwd(), "public", "documentos", "acervo", finalFilename),
      path.join(process.cwd(), "public", "documentos", "acervo", sanitizedName),
      path.join(process.cwd(), "public", "documentos", finalFilename),
      path.join(process.cwd(), "exemplo", finalFilename),
      path.join(process.cwd(), "exemplo", sanitizedName),
    ];

    for (const testPath of localCandidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ testPath)) {
        const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ testPath);
        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(finalFilename)}"`,
            "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
          },
        });
      }
    }

    // 2. High-Performance CDN Redirect (Zero Serverless RAM, Range Requests, <20ms execution)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qvvmpskixyjbislcatso.supabase.co";

    // Map to folder convention
    let folder = "acervo";
    if (finalFilename.startsWith("Ata_") || sanitizedName.startsWith("Ata_")) {
      folder = "atas";
    } else if (
      finalFilename.startsWith("Ato_") ||
      sanitizedName.startsWith("Ato_") ||
      finalFilename.startsWith("Edital_") ||
      sanitizedName.startsWith("Edital_") ||
      finalFilename.startsWith("Carta_") ||
      sanitizedName.startsWith("Carta_")
    ) {
      folder = "gestao";
    } else if (finalFilename.startsWith("anexo_") || sanitizedName.startsWith("anexo_")) {
      folder = "anexos";
    }

    const cdnBase = `${supabaseUrl}/storage/v1/object/public/documentos`;
    const objectPath = `${folder}/${sanitizedName}`;
    const redirectUrl = isDownload
      ? `${cdnBase}/${objectPath}?download=${encodeURIComponent(finalFilename)}`
      : `${cdnBase}/${objectPath}`;

    return NextResponse.redirect(redirectUrl, {
      status: 307,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("Erro ao servir documento PDF:", err);
    return NextResponse.json({ error: "Falha ao processar documento." }, { status: 500 });
  }
}
