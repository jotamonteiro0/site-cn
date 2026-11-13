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

    let decoded = filename;
    try {
      decoded = decodeURIComponent(filename);
    } catch {
      decoded = filename;
    }

    const safeName = path.basename(decoded);
    const finalFilename = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
    const sanitizedName = sanitize(finalFilename);
    const dispositionType = isDownload ? "attachment" : "inline";

    // 1. Resolução estática direta a partir do sistema de arquivos local
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
      if (fs.existsSync(testPath)) {
        const fileBuffer = fs.readFileSync(testPath);
        return new Response(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(finalFilename)}"`,
            "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
          },
        });
      }
    }

    // 2. Resolução remota via Supabase Storage (Streaming direto sem redirecionamento quebrado)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qvvmpskixyjbislcatso.supabase.co";

    // Pastas ordenadas por probabilidade
    let candidateFolders: string[] = ["acervo", "gestao", "atas", "anexos"];
    if (finalFilename.startsWith("Ata_") || sanitizedName.startsWith("Ata_")) {
      candidateFolders = ["atas", "gestao", "acervo"];
    } else if (
      finalFilename.startsWith("Ato_") ||
      sanitizedName.startsWith("Ato_") ||
      finalFilename.startsWith("Edital_") ||
      sanitizedName.startsWith("Edital_") ||
      finalFilename.startsWith("Carta_") ||
      sanitizedName.startsWith("Carta_")
    ) {
      candidateFolders = ["gestao", "atas", "acervo"];
    } else if (finalFilename.startsWith("anexo_") || sanitizedName.startsWith("anexo_")) {
      candidateFolders = ["anexos", "acervo", "gestao", "atas"];
    }

    const candidateNames = Array.from(new Set([sanitizedName, finalFilename]));

    for (const folder of candidateFolders) {
      for (const nameCandidate of candidateNames) {
        const cdnUrl = `${supabaseUrl}/storage/v1/object/public/documentos/${folder}/${encodeURIComponent(nameCandidate)}`;
        try {
          const upstreamRes = await fetch(cdnUrl, {
            headers: {
              "Accept": "application/pdf, */*",
            },
            cache: "force-cache",
          });

          if (upstreamRes.ok && upstreamRes.body) {
            return new Response(upstreamRes.body, {
              status: 200,
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(finalFilename)}"`,
                "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
              },
            });
          }
        } catch {
          // Continua para o próximo candidato se houver falha de rede transitória
        }
      }
    }

    // 3. Documento não localizado em nenhuma pasta do acervo
    return NextResponse.json(
      { error: "Documento oficial não localizado no acervo capitular." },
      { status: 404 }
    );
  } catch (err) {
    console.error("Erro ao servir documento PDF:", err);
    return NextResponse.json(
      { error: "Erro interno ao processar requisição do documento." },
      { status: 500 }
    );
  }
}
