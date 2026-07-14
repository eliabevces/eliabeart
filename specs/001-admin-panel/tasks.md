---

description: "Task list for the Painel de Administração de Álbuns e Imagens feature"
---

# Tasks: Painel de Administração de Álbuns e Imagens

> **Amendment (2026-07-14)**: o Keycloak usado pelo projeto saiu do ar. T004–T006 (originalmente `keycloak-js`) foram reimplementadas com `next-auth` v5 (Auth.js, Credentials provider local) — ver [research.md](./research.md) §1 (Amendment). Novos arquivos que não estavam no plano original: `auth.ts` e `middleware.ts` (raiz), `app/api/auth/[...nextauth]/route.ts`, `app/admin/login/page.tsx`. `app/admin/AdminAuthProvider.tsx` foi removido (substituído pelo `SessionProvider` do próprio Auth.js). Todas as chamadas `requireAuth(request)` nas rotas de API viraram `requireAuth()` (sessão lida via cookie, não Bearer header). Verificado localmente de ponta a ponta (login, senha errada, logout, middleware) — diferente do Keycloak, essa auth não depende de nenhum processo externo, então pôde ser testada de verdade.

**Input**: Design documents from `/specs/001-admin-panel/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/admin-api.md](./contracts/admin-api.md), [quickstart.md](./quickstart.md)

**Tests**: Não solicitados na spec (projeto sem suíte de testes automatizados hoje — ver Technical Context em plan.md). Validação é manual via quickstart.md; nenhuma task de teste automatizado foi gerada.

**Organization**: Tasks agrupadas por user story (US1–US4, conforme prioridade em spec.md) para permitir implementação e teste independentes de cada uma.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tasks incompletas)
- **[Story]**: A qual user story a task pertence (US1–US4)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único Next.js App Router (sem separação frontend/backend) — caminhos sob `app/`, conforme `plan.md` § Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar dependências e tipos compartilhados antes de qualquer user story.

- [X] T001 Adicionar dependência `keycloak-js` em `package.json` e instalar (`npm install keycloak-js`)
- [X] T002 [P] Criar `app/types/AdminUpload.ts` com o tipo `UploadResult` (ver data-model.md § Tipos novos)

**Checkpoint**: Dependências e tipos base disponíveis.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura que TODAS as user stories precisam — gate de autenticação do painel e as páginas-base que hospedam as ações de cada story.

**⚠️ CRITICAL**: Nenhuma user story pode começar antes desta fase estar completa.

- [X] T003 [P] Exportar `processImage` (hoje privada) em `app/lib/image-processing.ts`, para reuso pela rota de upload (research.md § 3)
- [X] T004 Criar `app/admin/AdminAuthProvider.tsx` — client component que inicializa `keycloak-js`, expõe `{ authenticated, token, login, logout }` via context
- [X] T005 Criar `app/admin/layout.tsx` — envolve as páginas filhas com `AdminAuthProvider`; redireciona para login do Keycloak (ou exibe acesso negado) quando `authenticated === false` (FR-001) (depende de T004)
- [X] T006 [P] Criar `app/lib/admin-api-client.ts` — wrapper de `fetch` que anexa `Authorization: Bearer <token>` (lido do `AdminAuthProvider`) em toda chamada às rotas administrativas
- [X] T007 Criar `app/admin/page.tsx` — lista todos os álbuns (nome, privacidade, contagem de fotos) usando `GET /api/albums/{id}` autenticado por álbum ou uma agregação equivalente (FR-002) (depende de T005, T006)
- [X] T008 Criar `app/admin/[album_id]/page.tsx` — shell da página de detalhe do álbum: busca `GET /api/albums/{id}` e `GET /api/images/{album_id}`, renderiza grade de imagens existente (sem ações ainda) (depende de T005, T006). Nota: implementado como Server Component (`page.tsx`) + Client Component (`AdminAlbumClient.tsx`), já que Client Components não podem `await params` nem usar `React.use()` (projeto usa React 18, não 19) — mesmo padrão já usado em `app/album/[album_id]/page.tsx` + `AlbumClient.tsx`.

**Checkpoint**: Login, navegação e visualização básica do painel funcionam — user stories podem começar.

---

## Phase 3: User Story 1 - Upload de novas imagens para um álbum (Priority: P1) 🎯 MVP

**Goal**: Administrador envia uma ou mais imagens para um álbum existente pelo painel (FR-003, FR-004, FR-005).

**Independent Test**: Login no painel → abrir álbum existente → enviar arquivos válidos e um inválido no mesmo lote → conferir resultado por arquivo e presença das novas imagens na galeria pública em até 1 minuto.

### Implementation for User Story 1

- [X] T009 [US1] Implementar `POST /api/albums/{id}/images` em `app/api/albums/[id]/images/route.ts`: recebe `multipart/form-data`, valida extensão `.jpg`/`.jpeg` por arquivo, grava no S3 (`putObject`/`imageKey`), reusa `processImage` (T003) sob o `jsonMutex`/`imagesLockKey` do álbum, invalida o cache `album_{id}_images`, retorna `UploadResult[]` (contracts/admin-api.md)
- [X] T010 [US1] Adicionar formulário de upload (`<input type="file" multiple>`) e lista de resultados por arquivo (sucesso/erro) em `app/admin/[album_id]/AdminAlbumClient.tsx`, chamando T009 via `admin-api-client` (depende de T008, T009)
- [X] T011 [US1] Adicionar validação client-side de extensão antes do envio e estado de carregamento durante o upload em `app/admin/[album_id]/AdminAlbumClient.tsx` (depende de T010)

**Checkpoint**: Upload de imagens funcional e testável de ponta a ponta — MVP entregável.

---

## Phase 4: User Story 2 - Alternar privacidade e gerenciar código de acesso (Priority: P1)

**Goal**: Administrador alterna um álbum entre público/privado e regenera o código de acesso pelo painel (FR-006, FR-007, FR-008).

**Independent Test**: Marcar álbum público como privado → conferir código exibido e que `/album/{id}` passa a exigi-lo → regenerar código e confirmar que o antigo para de funcionar → marcar como público novamente e confirmar acesso livre.

### Implementation for User Story 2

- [X] T012 [US2] Adicionar controles de "tornar privado/público" e "regenerar código" em `app/admin/[album_id]/AdminAlbumClient.tsx`, chamando `POST /api/albums/{id}/privacy` via `admin-api-client` (depende de T008)
- [X] T013 [US2] Exibir status de privacidade atual e o código de acesso (quando privado) em `app/admin/[album_id]/AdminAlbumClient.tsx`, a partir da resposta autenticada de `GET /api/albums/{id}` (depende de T008)

**Checkpoint**: Privacidade e código de acesso totalmente gerenciáveis pelo painel.

---

## Phase 5: User Story 3 - Definir a foto de capa do álbum (Priority: P2)

**Goal**: Administrador escolhe qualquer imagem existente do álbum como capa (FR-009).

**Independent Test**: Selecionar uma imagem diferente como capa pelo painel e confirmar que ela passa a aparecer no card do álbum na home (`/`).

### Implementation for User Story 3

- [X] T014 [US3] Adicionar ação "definir como capa" em cada imagem da grade de `app/admin/[album_id]/AdminAlbumClient.tsx`, chamando `PATCH /api/albums/{id}/cover` via `admin-api-client` (depende de T008)

**Checkpoint**: Capa do álbum configurável pelo painel.

---

## Phase 6: User Story 4 - Excluir álbuns e imagens individuais (Priority: P3)

**Goal**: Administrador exclui uma imagem específica ou um álbum inteiro, sempre com confirmação explícita (FR-010, FR-011, FR-012).

**Independent Test**: Tentar excluir sem confirmar (nada muda) → confirmar exclusão de uma imagem (some da galeria) → confirmar exclusão de um álbum de teste inteiro (some da home e do painel).

### Implementation for User Story 4

- [X] T015 [US4] Implementar `DELETE /api/albums/{id}/images` em `app/api/albums/[id]/images/route.ts`: recebe `{ imageName }`, remove a entrada de `images.json` e o objeto binário no S3 (`deleteObject`) sob o `jsonMutex` do álbum, invalida cache (contracts/admin-api.md) (depende de T009 — mesmo arquivo). Nota: implementado inline (não via `deleteImagesByNames`) para também apagar o objeto S3 e não deixar arquivo órfão no bucket.
- [X] T016 [P] [US4] Criar componente reutilizável `app/admin/ConfirmDialog.tsx` (título, mensagem, ações confirmar/cancelar)
- [X] T017 [US4] Adicionar ação "excluir imagem" por item da grade em `app/admin/[album_id]/AdminAlbumClient.tsx`, usando `ConfirmDialog` antes de chamar T015 (depende de T015, T016)
- [X] T018 [US4] Adicionar ação "excluir álbum" em `app/admin/[album_id]/AdminAlbumClient.tsx`, usando `ConfirmDialog` antes de chamar `DELETE /api/albums/{id}` já existente e redirecionar para `/admin` após excluir (depende de T016)

**Checkpoint**: Todas as 4 user stories funcionais de ponta a ponta.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Robustez do painel como um todo, cobrindo os edge cases da spec.

- [X] T019 [P] Tratar expiração de sessão (401 em qualquer chamada) em `app/lib/admin-api-client.ts`: interceptar resposta 401 e redirecionar para o login do Keycloak, sem completar a ação parcialmente (Edge Case da spec)
- [X] T020 Rodar a validação completa de `quickstart.md` (7 cenários, incluindo o teste de concorrência) e corrigir divergências encontradas. **Parcial**: `npm run lint` e `npm run build` passaram limpos (todas as rotas novas registradas corretamente); `GET /admin` responde 200 e o bundle client carrega sem exceções JS. Não foi possível validar os 7 cenários fim a fim neste sandbox — o backend S3 real e o servidor Keycloak real não são alcançáveis/utilizáveis a partir daqui (sem credenciais de teste nem Redirect URI do Keycloak configurado para localhost). Validação funcional completa (upload real, toggle de privacidade, capa, exclusão, concorrência) fica pendente para o ambiente real do usuário.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: depende de Setup — BLOQUEIA todas as user stories
- **User Stories (Phase 3–6)**: todas dependem de Foundational; podem prosseguir em paralelo entre si ou em ordem de prioridade (US1 → US2 → US3 → US4)
- **Polish (Phase 7)**: depende de todas as user stories desejadas estarem completas

### User Story Dependencies

- **US1 (P1 — Upload)**: depende só de Foundational; sem dependência de outras stories
- **US2 (P1 — Privacidade/código)**: depende só de Foundational; independente de US1
- **US3 (P2 — Capa)**: depende só de Foundational; independente de US1/US2
- **US4 (P3 — Exclusão)**: depende só de Foundational; T015 compartilha arquivo com T009 (US1) mas é uma rota HTTP distinta (`DELETE` vs `POST` no mesmo `route.ts`) — apenas T015 precisa que T009 já tenha criado o arquivo

### Within Each Story

- Rota de API antes da UI que a consome
- Componentes compartilhados (ex.: `ConfirmDialog`) antes das telas que os usam

### Parallel Opportunities

- T002 e T003 (Setup/Foundational) podem rodar em paralelo — arquivos diferentes
- T006 pode rodar em paralelo com T003 — arquivos diferentes
- Após o Checkpoint da Phase 2, US1, US2 e US3 podem ser implementadas em paralelo (arquivos majoritariamente distintos, exceto edições concorrentes em `app/admin/[album_id]/page.tsx` — coordenar se houver mais de um desenvolvedor)
- T016 (US4) pode começar em paralelo com US1/US2/US3, já que é um componente novo e isolado

---

## Parallel Example: Foundational

```bash
# Após T001, rodar em paralelo:
Task: "Export processImage in app/lib/image-processing.ts"       # T003
Task: "Create app/lib/admin-api-client.ts"                        # T006
```

## Parallel Example: User Story 4

```bash
# Em paralelo com o início de outras stories:
Task: "Create reusable app/admin/ConfirmDialog.tsx"                # T016
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (bloqueia tudo)
3. Completar Phase 3: US1 — Upload de imagens
4. **Parar e validar**: rodar o cenário 3 do quickstart.md isoladamente
5. Esse já é um MVP utilizável: o administrador consegue subir fotos sem depender de acesso manual ao bucket

### Incremental Delivery

1. Setup + Foundational → painel acessível com login funcionando
2. US1 (upload) → testar independentemente → já resolve a dor mais citada no roadmap
3. US2 (privacidade/código) → testar independentemente
4. US3 (capa) → testar independentemente
5. US4 (exclusão) → testar independentemente
6. Polish (sessão expirada + validação completa do quickstart)

---

## Notes

- [P] = arquivos diferentes, sem dependências entre si
- [Story] mapeia a task à user story correspondente para rastreabilidade
- Nenhuma task de teste automatizado foi gerada — o projeto não tem suíte de testes hoje; validação é manual via quickstart.md
- Task T015 (DELETE) e T009 (POST) editam o mesmo arquivo `app/api/albums/[id]/images/route.ts` — implementar T009 primeiro para criar o arquivo, depois adicionar o handler `DELETE` em T015
- Confirmar exclusão (T016–T018) é obrigatório por FR-012 — nenhuma ação destrutiva pode pular a etapa de confirmação
