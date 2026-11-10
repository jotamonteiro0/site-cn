import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const decoded = decodeURIComponent(filename);
    const safeName = path.basename(decoded);
    const targetPath = path.join(
      process.cwd(),
      "exemplo",
      safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`
    );

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(targetPath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(safeName)}"`,
      },
    });
  } catch (err) {
    console.error("Erro ao servir documento PDF:", err);
    return NextResponse.json({ error: "Falha ao ler documento." }, { status: 500 });
  }
}
