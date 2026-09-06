# O Satélite · Menu do dia

Aplicação web para gerir o catálogo de pratos do restaurante **O Satélite** e produzir o
menu impresso diário (A4) a partir de texto real, com um modelo fixo calibrado a partir da
fotografia do menu de referência.

## Como correr

```bash
cd osatelite-menu
npm install
npm run dev        # http://localhost:5173
```

Sem configuração adicional a aplicação arranca em **modo de demonstração local**
(etiqueta amarela "Demonstração local"): os dados ficam apenas no navegador e não são
partilhados entre dispositivos. Para uso real configure a base de dados (abaixo).

```bash
npm run build      # produção em dist/ (site estático)
npm run preview    # serve dist/ em http://localhost:4173
npm test           # testes unitários (vitest)
npm run test:e2e   # testes de ponta a ponta (Playwright, modo local)
```

## Base de dados partilhada (Supabase)

1. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` (chave *anon* ou *publishable* do projeto).
2. Aplique `supabase/migrations/0001_init.sql` ao projeto (SQL Editor ou CLI).
   Cria as tabelas `dishes`, `menus`, `settings` e `allowed_users`, ativa RLS e insere
   o catálogo inicial transcrito da fotografia (menu de 06-09-2026).
3. Insira o seu e-mail em `public.allowed_users`. Só esses e-mails conseguem ler ou
   escrever dados, mesmo que outra pessoa crie conta.
4. Crie o utilizador em *Authentication → Users* (ou use o já criado) e, no painel
   Supabase, desligue *Allow new users to sign up* se não quiser registos.
5. `npm run build` e publique `dist/` num alojamento estático (Netlify, Vercel,
   Cloudflare Pages…). O mesmo endereço serve para telemóvel e computador.

Verificação a partir da linha de comandos (faz login e lê o catálogo):

```bash
SUPABASE_EMAIL=... SUPABASE_PASSWORD=... npm run check:supabase
```

## Fluxo diário

1. **Menu do dia** → a data já vem preenchida com hoje (fuso Europa/Lisboa); mude-a
   para preparar o menu de amanhã.
2. **Duplicar o último menu** (ou *Começar menu vazio*).
3. **Escolher pratos** — marcar/desmarcar; *+ Novo prato* guarda no catálogo.
4. Ajustar preço só para hoje (o catálogo não muda) ou *Atualizar preço no catálogo*;
   ordenar com ↑ ↓ ou arrastar.
5. A gravação é automática ("A guardar…" / "Guardado" / "Erro ao guardar").
6. **Descarregar PDF**, **Descarregar PNG** ou **Imprimir** (no telemóvel use o botão
   *Pré-visualizar*).

Ficheiros gerados: `osatelite-menu-AAAA-MM-DD.pdf` (uma página A4, texto selecionável,
tipos de letra incorporados) e `osatelite-menu-AAAA-MM-DD.png` (2480 × 3508 px).

## Estrutura

```
src/domain/    tipos, categorias, dinheiro (cêntimos inteiros), datas (Lisboa), operações
               de menu, catálogo inicial, validação de cópias de segurança
src/storage/   adaptadores: Supabase (partilhado, autenticado) e local (demonstração)
src/render/    modelo fixo (template.ts), motor de layout (layout.ts) e os três
               renderizadores que usam as mesmas posições: SVG (pré-visualização e
               impressão), PDF (pdf-lib) e PNG (canvas)
src/ui/        interface em português europeu: Menu do dia, Pratos guardados,
               Histórico, Definições
public/brand/  logótipo (ficheiro fixo, recortado do cartaz Wi-Fi fornecido)
public/fonts/  Open Sans (SIL OFL) — substituto aberto do Segoe UI da referência
supabase/      migração SQL
tests/         testes Playwright
```

## Modelo impresso

- A4 vertical 210 × 297 mm; coluna de nomes a 21 mm, preços alinhados à direita a 188 mm.
- "PRATOS DO DIA", sopa logo abaixo sem cabeçalho, depois PEIXE, CARNE, VEGETARIANO,
  SOBREMESA DO DIA. Categorias vazias não aparecem.
- Rodapé fixo à esquerda e logótipo à direita, com espaço reservado: os pratos nunca
  podem ficar por cima.
- Quatro níveis de espaçamento controlado; o tamanho de letra só desce para 14 pt no
  último nível. Se mesmo assim não couber, a aplicação avisa e bloqueia a exportação.
- Os menus guardam uma cópia do nome, preço, dose e ordem de cada prato; alterar o
  catálogo nunca altera menus antigos.
