import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body?.token;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token de verificação do reCAPTCHA ausente." },
        { status: 400 }
      );
    }

    // Chave secreta oficial do Google reCAPTCHA v2 (configurada no ambiente de produção)
    const secretKey =
      process.env.RECAPTCHA_SECRET_KEY || "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

    const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }).toString(),
    });

    const data = await res.json();

    if (!data.success) {
      console.warn("reCAPTCHA Google siteverify rejected:", data);
      return NextResponse.json(
        {
          success: false,
          error: "Falha na verificação de segurança do Google reCAPTCHA. Tente novamente.",
          errorCodes: data["error-codes"],
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, hostname: data.hostname });
  } catch (err: unknown) {
    console.error("Erro na rota de verificação do reCAPTCHA:", err);
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor de verificação." },
      { status: 500 }
    );
  }
}
