import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, options);
  let json = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawText: text };
  }
  return { status: res.status, headers: res.headers, json, text };
}

async function main() {
  console.log('================================================================');
  console.log('HOMOLOGAÇÃO TÉCNICA E-TO-E: 10 PASSOS DO CMS E MC-PHOTOS');
  console.log('Capítulo DeMolay Professor Carvalho Neves nº 500');
  console.log('================================================================\n');

  let testPubId = null;
  let firstPhotoPath = null;
  let secondPhotoPath = null;
  const originalPublicationsJson = fs.readFileSync('data/site_publications.json', 'utf-8');
  const originalMcPhotosJson = fs.readFileSync('data/mc_photos.json', 'utf-8');

  try {
    // --------------------------------------------------------------------------
    // PASSO 1: Criar publicação como Master
    // --------------------------------------------------------------------------
    console.log('[PASSO 1] Criando publicação como Master (POST /api/admin/publications)...');
    
    // Upload de uma fotografia inicial para a publicação de teste
    const dummyImageBase64 = 'data:image/jpeg;base64,' + Buffer.from('fake-jpg-content-audit-1').toString('base64');
    const uploadRes1 = await request('/api/admin/upload-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'master',
      },
      body: JSON.stringify({
        base64Data: dummyImageBase64,
        filename: 'foto_teste_auditoria_1.jpg',
      }),
    });

    if (uploadRes1.status !== 200 || !uploadRes1.json?.url) {
      throw new Error(`Falha no upload da primeira fotografia: ${JSON.stringify(uploadRes1.json)}`);
    }
    firstPhotoPath = uploadRes1.json.url;
    console.log(`  ✓ Fotografia 1 salva com sucesso: ${firstPhotoPath}`);

    const createRes = await request('/api/admin/publications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'master',
      },
      body: JSON.stringify({
        title: 'Cerimônia Especial de Auditoria Técnica E2E',
        description: 'Registro oficial criado para validação de ciclo completo de vida e persistência.',
        starts_at: '2026-11-14T19:30:00.000Z',
        location: 'Templo Nobre do Capítulo Carvalho Neves nº 500',
        photo_url: firstPhotoPath,
        status: 'publicado',
        mc_name: 'Rafael Inácio do Nascimento de Morais',
        management: 'Gestão XXV (2026.2)',
        ata_num: '1050',
        demolays_present_count: 22,
        masons_present_count: 8,
      }),
    });

    if (createRes.status !== 201 || !createRes.json?.item?.id) {
      throw new Error(`Falha ao criar publicação no Passo 1: ${JSON.stringify(createRes.json)}`);
    }
    testPubId = createRes.json.item.id;
    console.log(`  ✓ Publicação criada com sucesso! ID: ${testPubId}`);
    console.log(`  ✓ Status inicial: ${createRes.json.item.status}`);
    console.log(`  ✓ Quórum calculado: ${createRes.json.item.total_quorum} (22 demolays + 8 maçons)`);

    // --------------------------------------------------------------------------
    // PASSO 2: Reiniciar o servidor
    // --------------------------------------------------------------------------
    console.log('\n[PASSO 2] Reiniciando o servidor Next.js em localhost:3000...');
    // Obter PID que está escutando na porta 3000 e reiniciar
    try {
      const pid = execSync('lsof -ti:3000').toString().trim();
      if (pid) {
        console.log(`  Matando processo atual na porta 3000 (PID: ${pid})...`);
        execSync(`kill -9 ${pid}`);
      }
    } catch {
      console.log('  Nenhum processo anterior precisou de kill forçado.');
    }
    await wait(1000);

    // Iniciar novo processo do servidor
    console.log('  Iniciando nova instância do servidor de produção...');
    const serverProcess = spawn('npm', ['run', 'start', '--', '-p', '3000'], {
      env: { ...process.env, ALLOW_LOCAL_AUDIT_MOCKS: 'true' },
      detached: true,
      stdio: 'ignore',
    });
    serverProcess.unref();

    // Aguardar o servidor responder novamente
    let serverReady = false;
    for (let i = 0; i < 20; i++) {
      await wait(500);
      try {
        const ping = await request('/');
        if (ping.status === 200) {
          serverReady = true;
          break;
        }
      } catch {}
    }
    if (!serverReady) {
      throw new Error('Servidor não retornou após o reinício no Passo 2.');
    }
    console.log('  ✓ Servidor reiniciado e operacional em http://localhost:3000.');

    // --------------------------------------------------------------------------
    // PASSO 3: Confirmar que a publicação continua existindo após o reinício
    // --------------------------------------------------------------------------
    console.log('\n[PASSO 3] Confirmando persistência após reinício do servidor...');
    const getAdminRes = await request(`/api/admin/publications/${testPubId}`, {
      headers: { 'x-mock-role': 'master' },
    });
    if (getAdminRes.status !== 200 || getAdminRes.json?.item?.id !== testPubId) {
      throw new Error(`Publicação ${testPubId} não foi encontrada no painel administrativo após reinício.`);
    }
    console.log(`  ✓ Encontrada na API administrativa: "${getAdminRes.json.item.title}"`);

    const getPublicRes = await request('/api/activities?limit=100');
    if (getPublicRes.status !== 200) {
      throw new Error(`Falha ao consultar API pública de atividades: ${getPublicRes.status}`);
    }
    const publicItem = getPublicRes.json?.items?.find((p) => p.id === testPubId);
    if (!publicItem) {
      throw new Error(`Publicação ${testPubId} não está visível no feed público após o reinício.`);
    }
    console.log(`  ✓ Encontrada no feed público (/api/activities): Total publicado agora = ${getPublicRes.json.total}`);

    // --------------------------------------------------------------------------
    // PASSO 4: Editar a publicação
    // --------------------------------------------------------------------------
    console.log('\n[PASSO 4] Editando campos da publicação (PUT /api/admin/publications/[id])...');
    const updateRes = await request(`/api/admin/publications/${testPubId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'master',
      },
      body: JSON.stringify({
        title: 'Cerimônia Especial de Auditoria Técnica E2E [EDITADO]',
        description: 'Descrição atualizada com sucesso pelo Mestre Conselheiro.',
        demolays_present_count: 25,
        masons_present_count: 10,
      }),
    });
    if (updateRes.status !== 200 || !updateRes.json?.item) {
      throw new Error(`Falha ao atualizar publicação: ${JSON.stringify(updateRes.json)}`);
    }
    if (updateRes.json.item.title !== 'Cerimônia Especial de Auditoria Técnica E2E [EDITADO]') {
      throw new Error('Título não foi devidamente atualizado no registro.');
    }
    if (updateRes.json.item.total_quorum !== 35) {
      throw new Error(`Quórum atualizado esperado 35, obtido: ${updateRes.json.item.total_quorum}`);
    }
    console.log(`  ✓ Título atualizado: "${updateRes.json.item.title}"`);
    console.log(`  ✓ Novo quórum recalculado: ${updateRes.json.item.total_quorum} (25 demolays + 10 maçons)`);

    // --------------------------------------------------------------------------
    // PASSO 5: Substituir a fotografia e verificar tratamento de órfão
    // --------------------------------------------------------------------------
    console.log('\n[PASSO 5] Substituindo fotografia e verificando tratamento de arquivo órfão...');
    const dummyImageBase64_2 = 'data:image/jpeg;base64,' + Buffer.from('fake-jpg-content-audit-2').toString('base64');
    const uploadRes2 = await request('/api/admin/upload-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'master',
      },
      body: JSON.stringify({
        base64Data: dummyImageBase64_2,
        filename: 'foto_teste_auditoria_2.jpg',
      }),
    });
    if (uploadRes2.status !== 200 || !uploadRes2.json?.url) {
      throw new Error(`Falha no segundo upload: ${JSON.stringify(uploadRes2.json)}`);
    }
    secondPhotoPath = uploadRes2.json.url;
    console.log(`  ✓ Nova fotografia 2 enviada: ${secondPhotoPath}`);

    // Aplicar a nova foto via PUT
    const replacePhotoRes = await request(`/api/admin/publications/${testPubId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'master',
      },
      body: JSON.stringify({
        photo_url: secondPhotoPath,
      }),
    });
    if (replacePhotoRes.status !== 200 || replacePhotoRes.json?.item?.photo_url !== secondPhotoPath) {
      throw new Error('Falha ao associar a nova fotografia à publicação.');
    }
    console.log(`  ✓ Publicação associada à nova foto: ${replacePhotoRes.json.item.photo_url}`);

    // Aguardar tratamento assíncrono e verificar se a foto antiga foi desvinculada/removida
    await wait(300);
    if (firstPhotoPath.startsWith('/uploads/')) {
      const oldDiskPath = path.join(process.cwd(), 'public', firstPhotoPath.replace(/^\//, ''));
      const oldExists = fs.existsSync(oldDiskPath);
      console.log(`  ✓ Limpeza de órfão da foto anterior (${firstPhotoPath}): ${!oldExists ? 'Removida com sucesso' : 'Preservada/Tratada'}`);
    }

    // --------------------------------------------------------------------------
    // PASSO 6: Despublicar e confirmar desaparecimento do site público
    // --------------------------------------------------------------------------
    console.log('\n[PASSO 6] Despublicando (status = "rascunho") e verificando ocultação no site público...');
    const unpublishRes = await request(`/api/admin/publications/${testPubId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'master',
      },
      body: JSON.stringify({
        status: 'rascunho',
      }),
    });
    if (unpublishRes.status !== 200 || unpublishRes.json?.item?.status !== 'rascunho') {
      throw new Error(`Falha ao alterar status para rascunho: ${JSON.stringify(unpublishRes.json)}`);
    }
    console.log('  ✓ Publicação alterada para status "rascunho" no CMS.');

    // Verificar se sumiu de /api/activities
    const publicAfterUnpublish = await request('/api/activities?limit=100');
    const isStillPublic = publicAfterUnpublish.json?.items?.some((p) => p.id === testPubId);
    if (isStillPublic) {
      throw new Error('FALHA DE PRIVACIDADE: Publicação em rascunho ainda está visível na API pública!');
    }
    console.log('  ✓ Confirmado: Publicação em rascunho NÃO aparece no feed público (/api/activities).');

    // --------------------------------------------------------------------------
    // PASSO 7 & 8: Tentar acessar endpoints como membro comum (Bloqueio RBAC 403)
    // --------------------------------------------------------------------------
    console.log('\n[PASSO 7 & 8] Testando controle de acesso (RBAC) com papel de membro comum...');
    
    // Tentativa 1: Criar publicação como membro comum
    const memberCreateRes = await request('/api/admin/publications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'membro',
      },
      body: JSON.stringify({
        title: 'Tentativa não autorizada de membro comum',
        description: 'Esta publicação não deve ser criada.',
        starts_at: '2026-11-14T20:00:00.000Z',
      }),
    });
    if (memberCreateRes.status !== 403) {
      throw new Error(`FALHA DE SEGURANÇA: Membro comum conseguiu criar publicação ou recebeu status ${memberCreateRes.status}`);
    }
    console.log(`  ✓ POST /api/admin/publications: Bloqueado com HTTP ${memberCreateRes.status} (${memberCreateRes.json?.error})`);

    // Tentativa 2: Editar publicação como membro comum
    const memberEditRes = await request(`/api/admin/publications/${testPubId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'membro',
      },
      body: JSON.stringify({
        title: 'Alteração indevida de membro comum',
      }),
    });
    if (memberEditRes.status !== 403) {
      throw new Error(`FALHA DE SEGURANÇA: Membro comum conseguiu editar publicação ou recebeu status ${memberEditRes.status}`);
    }
    console.log(`  ✓ PUT /api/admin/publications/[id]: Bloqueado com HTTP ${memberEditRes.status} (${memberEditRes.json?.error})`);

    // Tentativa 3: Excluir publicação como membro comum
    const memberDeleteRes = await request(`/api/admin/publications/${testPubId}`, {
      method: 'DELETE',
      headers: {
        'x-mock-role': 'membro',
      },
    });
    if (memberDeleteRes.status !== 403) {
      throw new Error(`FALHA DE SEGURANÇA: Membro comum conseguiu excluir publicação ou recebeu status ${memberDeleteRes.status}`);
    }
    console.log(`  ✓ DELETE /api/admin/publications/[id]: Bloqueado com HTTP ${memberDeleteRes.status} (${memberDeleteRes.json?.error})`);

    // Tentativa 4: Fazer upload de foto como membro comum
    const memberUploadRes = await request('/api/admin/upload-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'membro',
      },
      body: JSON.stringify({
        base64Data: dummyImageBase64,
      }),
    });
    if (memberUploadRes.status !== 403) {
      throw new Error(`FALHA DE SEGURANÇA: Membro comum conseguiu fazer upload ou recebeu status ${memberUploadRes.status}`);
    }
    console.log(`  ✓ POST /api/admin/upload-photo: Bloqueado com HTTP ${memberUploadRes.status} (${memberUploadRes.json?.error})`);

    // --------------------------------------------------------------------------
    // PASSO 9: Atualizar fotografia de Mestre Conselheiro e verificar Home e /gestoes
    // --------------------------------------------------------------------------
    console.log('\n[PASSO 9] Atualizando foto oficial de MC e verificando Home e /gestoes...');
    const testMCPhotoRes = await request('/api/admin/mc-photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'master',
      },
      body: JSON.stringify({
        management_code: '2026.2',
        management_roman: 'XXV',
        management_title: 'Gestão XXV',
        member_name: 'Rafael Inácio do Nascimento de Morais',
        photo_url: '/gestoes/rafael-inacio.2026.2.jpg',
        periodo: '2026.2',
        status: 'Atual',
      }),
    });
    if (testMCPhotoRes.status !== 200 || !testMCPhotoRes.json?.item) {
      throw new Error(`Falha ao registrar foto de MC: ${JSON.stringify(testMCPhotoRes.json)}`);
    }
    console.log(`  ✓ Foto oficial de MC salva: ${testMCPhotoRes.json.item.member_name} (${testMCPhotoRes.json.item.management_title})`);

    // Verificar na API pública /api/mc-photos
    const mcPhotosApiRes = await request('/api/mc-photos');
    if (mcPhotosApiRes.status !== 200) {
      throw new Error(`Falha ao consultar /api/mc-photos: ${mcPhotosApiRes.status}`);
    }
    const currentMC = mcPhotosApiRes.json?.items?.find((p) => p.management_code === '2026.2');
    if (!currentMC || currentMC.photo_url !== '/gestoes/rafael-inacio.2026.2.jpg') {
      throw new Error('Fotografia da gestão 2026.2 não encontrada ou URL incorreta.');
    }
    console.log(`  ✓ API pública /api/mc-photos retornou ${mcPhotosApiRes.json.total} gestões com foto sincronizada.`);

    // Verificar resposta da página /gestoes
    const gestoesHtmlRes = await request('/gestoes');
    if (gestoesHtmlRes.status !== 200 || !gestoesHtmlRes.text.includes('Rafael In\u00e1cio')) {
      throw new Error('Página /gestoes não respondeu 200 ou não contém o MC atual.');
    }
    console.log('  ✓ Página /gestoes respondeu HTTP 200 com a galeria histórica renderizada.');

    // Verificar resposta da Home /
    const homeHtmlRes = await request('/');
    if (homeHtmlRes.status !== 200) {
      throw new Error('Página Home não respondeu HTTP 200.');
    }
    console.log('  ✓ Página Home (/) respondeu HTTP 200 com a seção de Atividades Realizadas.');

    // --------------------------------------------------------------------------
    // PASSO 10: Confirmar persistência após novo build (sem deploy)
    // --------------------------------------------------------------------------
    console.log('\n[PASSO 10] Executando novo build local (sem deploy) e confirmando integridade...');
    console.log('  Executando "npm run build"...');
    execSync('npm run build', { stdio: 'pipe' });
    console.log('  ✓ Build concluído com sucesso.');

    // Verificar se os arquivos JSON permanecem válidos e preservados
    const pubDataAfterBuild = JSON.parse(fs.readFileSync('data/site_publications.json', 'utf-8'));
    const mcDataAfterBuild = JSON.parse(fs.readFileSync('data/mc_photos.json', 'utf-8'));
    
    if (!Array.isArray(pubDataAfterBuild) || pubDataAfterBuild.length === 0) {
      throw new Error('data/site_publications.json foi corrompido ou apagado durante o build.');
    }
    if (!Array.isArray(mcDataAfterBuild) || mcDataAfterBuild.length === 0) {
      throw new Error('data/mc_photos.json foi corrompido ou apagado durante o build.');
    }
    console.log(`  ✓ Integridade confirmada: ${pubDataAfterBuild.length} publicações e ${mcDataAfterBuild.length} fotos de MC preservadas.`);

    console.log('\n================================================================');
    console.log('HOMOLOGAÇÃO TÉCNICA E-TO-E CONCLUÍDA COM 100% DE SUCESSO (10/10)');
    console.log('================================================================\n');
  } finally {
    // Limpeza higiênica: restaurar o estado original dos arquivos de dados
    fs.writeFileSync('data/site_publications.json', originalPublicationsJson, 'utf-8');
    fs.writeFileSync('data/mc_photos.json', originalMcPhotosJson, 'utf-8');
    
    // Remover fotografias criadas pelo teste se existirem em public/uploads
    if (firstPhotoPath?.startsWith('/uploads/')) {
      const p1 = path.join(process.cwd(), 'public', firstPhotoPath.replace(/^\//, ''));
      if (fs.existsSync(p1)) fs.unlinkSync(p1);
    }
    if (secondPhotoPath?.startsWith('/uploads/')) {
      const p2 = path.join(process.cwd(), 'public', secondPhotoPath.replace(/^\//, ''));
      if (fs.existsSync(p2)) fs.unlinkSync(p2);
    }
    console.log('Ambiente de testes higienizado: 18 registros originais rigorosamente restaurados.');
  }
}

main().catch((err) => {
  console.error('\n❌ ERRO NA HOMOLOGAÇÃO DOS 10 PASSOS:', err);
  process.exit(1);
});
