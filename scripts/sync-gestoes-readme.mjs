import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gestoesDir = path.resolve(__dirname, "../public/gestoes");
const readmePath = path.resolve(gestoesDir, "README.md");

const gestaoData = [
  { numero: "XXVI", periodo: "2027.1", mc: "João Guilherme Martins Lopes Monteiro", file: "joao-guilherme.2027.1.jpg" },
  { numero: "XXV", periodo: "2026.2", mc: "Rafael Inácio do Nascimento de Morais", file: "rafael-inacio.2026.2.jpg" },
  { numero: "XXIV", periodo: "2026.1", mc: "José Keltton Cardoso da Silva Viana", file: "jose-keltton.2026.1.jpg" },
  { numero: "XXIII", periodo: "2025.2", mc: "João Guilherme Martins Lopes Monteiro", file: "joao-guilherme.2025.2.jpg" },
  { numero: "XXII", periodo: "2025.1", mc: "Epaminondas Coutinho Feitosa Júnior", file: "epaminondas-junior.2025.1.jpg" },
  { numero: "XXI", periodo: "2024.2", mc: "Fábio Anicácio Brito Correia", file: "fabio-anicacio.2024.2.jpg" },
  { numero: "XX", periodo: "2024.1", mc: "Wesley de Sousa Pinheiro de Abreu", file: "wesley-abreu.2024.1.jpg" },
  { numero: "XIX", periodo: "2023.2", mc: "Caio Carvalho Fonseca Lima", file: "caio-carvalho.2023.2.jpg" },
  { numero: "XVIII", periodo: "2023.1", mc: "Wesley de Sousa Pinheiro de Abreu", file: "wesley-abreu.2023.1.jpg" },
  { numero: "XVII", periodo: "2020.1", mc: "Gabriel Dias", file: "gabriel-dias.2020.1.jpg" },
  { numero: "XVI", periodo: "2019.2", mc: "Vinícius Linhares", file: "vinicius-linhares.2019.2.jpg" },
  { numero: "XV", periodo: "2019.1", mc: "Gustavo Vilarinho", file: "gustavo-vilarinho.2019.1.jpg" },
  { numero: "XIV", periodo: "2018.2", mc: "Tomaz Neto", file: "tomaz-neto.2018.2.jpg" },
  { numero: "XIII", periodo: "2018.1", mc: "Ezequias Júnior", file: "ezequias-junior.2018.1.jpg" },
  { numero: "XII", periodo: "2017.2", mc: "Rafael Rocha", file: "rafael-rocha.2017.2.jpg" },
  { numero: "XI", periodo: "2017.1", mc: "Breno Correia", file: "breno-correia.2017.1.jpg" },
  { numero: "X", periodo: "2016.2", mc: "Cleilson Almeida", file: "cleilson-almeida.2016.2.jpg" },
  { numero: "IX", periodo: "2016.1", mc: "Ericles Guerra", file: "ericles-guerra.2016.1.jpg" },
  { numero: "VIII", periodo: "2015.2", mc: "Itamar Filho", file: "itamar-filho.2015.2.jpg" },
  { numero: "VII", periodo: "2015.1", mc: "Renandro Reis", file: "renandro-reis.2015.1.jpg" },
  { numero: "VI", periodo: "2014.2", mc: "Marcelo Negreiros Júnior", file: "marcelo-negreiros.2014.2.jpg" },
  { numero: "V", periodo: "2014.1", mc: "Victor Barros", file: "victor-barros.2014.1.jpg" },
  { numero: "IV", periodo: "2013.2", mc: "Arthur Cerqueira", file: "arthur-cerqueira.2013.2.jpg" },
  { numero: "III", periodo: "2013.1", mc: "Diógenes Quaresma", file: "diogenes-quaresma.2013.1.jpg" },
  { numero: "I / II", periodo: "2012.1 / 2012.2", mc: "Tiago Moreira", file: "tiago-moreira.2012.1.jpg" },
];

let presentes = 0;
let pendentes = 0;

const rows = gestaoData.map((g) => {
  const filePath = path.resolve(gestoesDir, g.file);
  const exists = fs.existsSync(filePath);
  if (exists) presentes++;
  else pendentes++;

  const status = exists ? "✅ **Presente**" : "⏳ Pendente";
  return `| **${g.numero}** | ${g.periodo} | ${g.mc} | \`${g.file}\` | ${status} |`;
});

const total = gestaoData.length;
const percent = Math.round((presentes / total) * 100);

const content = `# 📸 Galeria Oficial de Mestres Conselheiros — Nomenclatura Padrão

Este diretório armazena as fotos oficiais dos Mestres Conselheiros do **Capítulo Professor Carvalho Neves Nº 500**.

> 📊 **Status da Galeria:** ${presentes} de ${total} fotos cadastradas (${percent}% concluído) • ${pendentes} pendentes

## 📌 Padrão de Nomenclatura dos Arquivos

Use sempre letras minúsculas, sem acentos, com nomes separados por hífen e a extensão \`.jpg\`:

\`\`\`text
[primeiro-nome]-[ultimo-nome].[ano].[semestre].jpg
\`\`\`

---

## 📋 Lista Oficial com os Nomes Exatos de Todas as Fotos

Basta salvar a imagem na pasta \`public/gestoes/\` com o nome indicado abaixo. O site exibirá a foto automaticamente!

|   Gestão   |     Período     | Mestre Conselheiro                    | Nome Exato do Arquivo           |  Status Atual  |
| :--------: | :-------------: | :------------------------------------ | :------------------------------ | :------------: |
${rows.join("\n")}

---

### Dicas para as imagens:
- **Formato recomendado**: \`.jpg\` ou \`.webp\`.
- **Proporção**: Vertical / Retrato (3:4 ou 4:5).
- Enquanto a foto não for adicionada, o sistema exibe automaticamente o brasão/insígnia oficial como placeholder elegante.
`;

fs.writeFileSync(readmePath, content, "utf-8");
console.log(`README atualizado com sucesso! ${presentes}/${total} fotos presentes.`);
