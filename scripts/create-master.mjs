import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

if (!fs.existsSync(envPath)) {
  console.error("Arquivo .env.local não encontrado.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx > -1) {
    const k = trimmed.substring(0, idx).trim();
    let v = trimmed.substring(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.substring(1, v.length - 1);
    }
    env[k] = v;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos em .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Processa argumentos de linha de comando:
// node scripts/create-master.mjs --email=joaomonteiro0@icloud.com --password=SuaSenha --name="João Guilherme" --cid="12345"
const args = process.argv.slice(2);
const params = {};
for (const arg of args) {
  if (arg.startsWith("--")) {
    const [key, val] = arg.substring(2).split("=");
    params[key] = val;
  }
}

const email = params.email || "joaomonteiro0@icloud.com";
const password = params.password;
const fullName = params.name || "João Guilherme Monteiro";
const cid = params.cid || "00001";
const CHAPTER_ID = "00000000-0000-0000-0000-000000000500";

if (!password) {
  console.log("================================================================================");
  console.log("Uso: node scripts/create-master.mjs --password=\"SuaSenhaForte\" [--email=\"...\"] [--name=\"...\"] [--cid=\"...\"]");
  console.log("Exemplo:");
  console.log(`node scripts/create-master.mjs --password="minhasenha123" --email="${email}" --name="${fullName}" --cid="${cid}"`);
  console.log("================================================================================");
  process.exit(1);
}

async function run() {
  console.log(`[1/4] Verificando existência de usuário para: ${email}...`);
  
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Erro ao listar usuários:", listError);
    process.exit(1);
  }

  let user = userList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.log(`[2/4] Criando novo usuário auth.users com e-mail confirmado...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      console.error("Erro ao criar usuário:", createError);
      process.exit(1);
    }
    user = newUser.user;
    console.log(`✓ Usuário criado com sucesso! ID: ${user.id}`);
  } else {
    console.log(`[2/4] Usuário já existia. Atualizando senha e metadata...`);
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (updateError) {
      console.error("Erro ao atualizar usuário:", updateError);
      process.exit(1);
    }
    user = updated.user;
    console.log(`✓ Usuário atualizado com sucesso! ID: ${user.id}`);
  }

  console.log(`[3/4] Sincronizando perfil em public.profiles...`);
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: fullName,
      email: email,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    console.error("Erro ao sincronizar public.profiles:", profileError);
    process.exit(1);
  }
  console.log(`✓ Perfil sincronizado em public.profiles.`);

  console.log(`[4/4] Vinculando registro de membro e acesso Master no Capítulo 500...`);
  // Busca ou cria membro
  const { data: existingMember } = await supabase
    .from("members")
    .select("id")
    .eq("chapter_id", CHAPTER_ID)
    .eq("profile_id", user.id)
    .maybeSingle();

  let memberId = existingMember?.id;

  if (!memberId) {
    const { data: newMember, error: memberError } = await supabase
      .from("members")
      .insert({
        chapter_id: CHAPTER_ID,
        profile_id: user.id,
        cid: cid,
        full_name: fullName,
        email: email,
        member_type: "demolay",
        status: "ativo",
        is_active: true,
      })
      .select("id")
      .single();

    if (memberError) {
      console.error("Erro ao criar membro em public.members:", memberError);
      process.exit(1);
    }
    memberId = newMember.id;
  } else {
    await supabase
      .from("members")
      .update({
        cid: cid,
        full_name: fullName,
        email: email,
        is_active: true,
      })
      .eq("id", memberId);
  }
  console.log(`✓ Registro de membro confirmado (ID: ${memberId}, CID: ${cid}).`);

  // Vincula em chapter_memberships como 'master'
  const { error: membershipError } = await supabase
    .from("chapter_memberships")
    .upsert(
      {
        chapter_id: CHAPTER_ID,
        user_id: user.id,
        member_id: memberId,
        role_code: "master",
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "chapter_id,user_id" }
    );

  if (membershipError) {
    console.error("Erro ao vincular chapter_memberships:", membershipError);
    process.exit(1);
  }

  console.log(`✓ Vínculo como Master/Admin confirmado no Capítulo Carvalho Neves Nº 500!`);
  console.log("================================================================================");
  console.log(`SUCESSO! O usuário ${fullName} (${email}) foi configurado como Master/Admin.`);
  console.log(`Login disponível por e-mail (${email}) ou por CID (${cid}).`);
  console.log("================================================================================");
}

run().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
