import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Auditoria de Controle de Acesso (RBAC) — Chamada, Atas, Reuniões e Dashboard", () => {
  const chamadaPath = path.resolve(process.cwd(), "app/(dashboard)/dashboard/chamada/page.tsx");
  const dashboardPath = path.resolve(process.cwd(), "app/(dashboard)/dashboard/page.tsx");

  test("1. Verificação estrutural de RBAC em chamada/page.tsx", () => {
    assert.ok(fs.existsSync(chamadaPath), "chamada/page.tsx deve existir");
    const content = fs.readFileSync(chamadaPath, "utf-8");

    // Verifica presença de verificação de papel e modo membro
    assert.match(content, /userRole/);
    assert.match(content, /viewAsMember/);
    assert.match(content, /effectiveRole/);
    assert.match(content, /isMaster\s*=/);
    assert.match(content, /canManageAttendance\s*=/);

    // Verifica que ações exclusivas de Master estão condicionadas a isMaster
    assert.match(content, /\{isMaster && \(/);
    assert.match(content, /getGoogleCalendarUrl/);
    assert.match(content, /setIsConvocationModalOpen/);
    assert.match(content, /Editar Reunião/);
    assert.match(content, /Nova Reunião/);

    // Verifica que salvar chamada e ata estão condicionados a canManageAttendance
    assert.match(content, /canManageAttendance\s*\?\s*\(/);
    assert.match(content, /Modo Leitura \(Membro\)/);
    assert.match(content, /Salvar no Livro de Atas/);

    // Verifica que manipuladores possuem travas de segurança ativas
    assert.match(content, /if \(!canManageAttendance\) \{[\s\S]*?alert\("Acesso restrito à Diretoria para salvar a chamada."\)/);
    assert.match(content, /if \(!canManageAttendance\) \{[\s\S]*?alert\("Acesso restrito à Diretoria para registrar atas."\)/);
    assert.match(content, /if \(!isMaster\) \{[\s\S]*?alert\("Acesso restrito ao Mestre Conselheiro\/Master para cadastrar ou editar reuniões."\)/);
  });

  test("2. Verificação estrutural de RBAC em dashboard/page.tsx", () => {
    assert.ok(fs.existsSync(dashboardPath), "dashboard/page.tsx deve existir");
    const content = fs.readFileSync(dashboardPath, "utf-8");

    // Verifica presença de verificação de papel e modo membro
    assert.match(content, /userRole/);
    assert.match(content, /viewAsMember/);
    assert.match(content, /effectiveRole/);
    assert.match(content, /isMaster\s*=/);
    assert.match(content, /canManage\s*=/);

    // Verifica que atalhos rápidos alternam entre Diretoria e Membro
    assert.match(content, /canManage \? \(/);
    assert.match(content, /Meu Autoatendimento/);
    assert.match(content, /Consultar Frequência/);

    // Verifica que botão Google Agenda só aparece para Master
    assert.match(content, /\{isMaster && \([\s\S]*?getGoogleCalendarUrl\(nextMeeting\)[\s\S]*?Google Agenda/);

    // Verifica que ação da próxima sessão alterna entre Fazer Chamada e Ver Detalhes
    assert.match(content, /Ver Detalhes da Sessão/);
  });

  test("3. Matriz de Permissões: Regras Canônicas DeMolay", () => {
    const evaluatePermissions = ({ role, viewAsMember, idDemolay, email }) => {
      const isPermanentMaster =
        idDemolay === "127738" ||
        idDemolay === "102836" ||
        email === "joaomonteiro0@icloud.com" ||
        email === "airton@carvalhoneves500.org.br";

      const effectiveRole = viewAsMember ? "membro" : (isPermanentMaster ? "master" : (role || "membro"));
      const isMaster = effectiveRole === "master" || effectiveRole === "admin";
      const canManageAttendance = isMaster || effectiveRole === "escrivao";

      return {
        effectiveRole,
        isMaster,
        canManageAttendance,
        canEditMeeting: isMaster,
        canCreateMeeting: isMaster,
        canOfficialConvocation: isMaster,
        canGoogleCalendar: isMaster,
        canSaveAttendance: canManageAttendance,
        canSaveMinute: canManageAttendance,
        canManageVisitors: canManageAttendance,
      };
    };

    // Caso 1: Membro regular
    const membro = evaluatePermissions({ role: "membro", viewAsMember: false, idDemolay: "148194", email: "membro@carvalhoneves500.org.br" });
    assert.equal(membro.effectiveRole, "membro");
    assert.equal(membro.isMaster, false);
    assert.equal(membro.canManageAttendance, false);
    assert.equal(membro.canEditMeeting, false);
    assert.equal(membro.canCreateMeeting, false);
    assert.equal(membro.canOfficialConvocation, false);
    assert.equal(membro.canGoogleCalendar, false);
    assert.equal(membro.canSaveAttendance, false);
    assert.equal(membro.canSaveMinute, false);
    assert.equal(membro.canManageVisitors, false);

    // Caso 2: Master em modo "Ver como Membro"
    const masterComoMembro = evaluatePermissions({ role: "master", viewAsMember: true, idDemolay: "127738", email: "joaomonteiro0@icloud.com" });
    assert.equal(masterComoMembro.effectiveRole, "membro");
    assert.equal(masterComoMembro.isMaster, false);
    assert.equal(masterComoMembro.canManageAttendance, false);
    assert.equal(masterComoMembro.canEditMeeting, false);
    assert.equal(masterComoMembro.canSaveAttendance, false);
    assert.equal(masterComoMembro.canGoogleCalendar, false);

    // Caso 3: Escrivão (responsável pelas Atas e Chamada na ausência/delegação do MC)
    const escrivao = evaluatePermissions({ role: "escrivao", viewAsMember: false, idDemolay: "148200", email: "escrivao@carvalhoneves500.org.br" });
    assert.equal(escrivao.effectiveRole, "escrivao");
    assert.equal(escrivao.isMaster, false);
    assert.equal(escrivao.canManageAttendance, true);
    assert.equal(escrivao.canSaveAttendance, true);
    assert.equal(escrivao.canSaveMinute, true);
    assert.equal(escrivao.canManageVisitors, true);
    assert.equal(escrivao.canEditMeeting, false);
    assert.equal(escrivao.canOfficialConvocation, false);
    assert.equal(escrivao.canGoogleCalendar, false);

    // Caso 4: Mestre Conselheiro / Master pleno
    const master = evaluatePermissions({ role: "master", viewAsMember: false, idDemolay: "127738", email: "joaomonteiro0@icloud.com" });
    assert.equal(master.effectiveRole, "master");
    assert.equal(master.isMaster, true);
    assert.equal(master.canManageAttendance, true);
    assert.equal(master.canEditMeeting, true);
    assert.equal(master.canCreateMeeting, true);
    assert.equal(master.canOfficialConvocation, true);
    assert.equal(master.canGoogleCalendar, true);
    assert.equal(master.canSaveAttendance, true);
    assert.equal(master.canSaveMinute, true);
    assert.equal(master.canManageVisitors, true);
  });
});
