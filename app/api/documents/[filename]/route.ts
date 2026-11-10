import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
    const targetPath = path.join(process.cwd(), "exemplo", finalFilename);

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(targetPath);
    const dispositionType = isDownload ? "attachment" : "inline";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(finalFilename)}"`,
      },
    });
  } catch (err) {
    console.error("Erro ao servir documento PDF:", err);
    return NextResponse.json({ error: "Falha ao ler documento." }, { status: 500 });
  }
}
