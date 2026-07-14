# Implementation Plan: Painel de Administração de Álbuns e Imagens

**Branch**: `001-admin-panel` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-admin-panel/spec.md`

> **Amendment (2026-07-14)**: o servidor Keycloak que este plano assumia saiu do ar. Autenticação migrada de Keycloak (`keycloak-js` + Bearer JWT contra JWKS remoto) para `next-auth` v5 (Auth.js) com `Credentials` provider local (usuário/senha em env vars) + sessão JWT em cookie — sem depender de nenhum processo externo. Ver [research.md](./research.md) §1 (Amendment) para o racional completo. As menções a Keycloak abaixo refletem o plano original; o comportamento real implementado usa Auth.js.

## Summary

Um painel em `/admin`, protegido por login local (via `next-auth`/Auth.js, `Credentials` provider, sem processo externo), que permite ao administrador único do EliabeArt: listar todos os álbuns (incluindo privados) com contagem de fotos; enviar novas imagens para um álbum (funcionalidade nova); definir a capa de um álbum; alternar privacidade e regenerar código de acesso; e excluir álbuns/imagens individuais mediante confirmação. A maior parte do backend necessário já existe (`app/lib/albums.ts`, `app/api/albums/[id]/{cover,privacy}`, `DELETE /api/albums/[id]`); a novidade real é a rota de upload de imagens e a UI do painel.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 15 (App Router), React 18 — stack já fixada pela constitution do projeto.

**Primary Dependencies**: Next.js, `@aws-sdk/client-s3`, `sharp`, `blurhash` (já em uso). Nova dependência: `next-auth` v5/Auth.js (substituiu `keycloak-js` e o uso direto de `jose`, ver [research.md](./research.md) §1 Amendment).

**Storage**: AWS S3 / MinIO via `app/lib/s3.ts` (existente, sem mudança de esquema de armazenamento).

**Testing**: Não há suíte de testes automatizados configurada no projeto hoje. Validação desta feature é manual, via os cenários descritos em [quickstart.md](./quickstart.md).

**Target Platform**: Web — Next.js self-hospedado via Docker/`docker-compose` (sem limite de payload tipo serverless), acessado por navegador desktop/mobile.

**Project Type**: Aplicação web única (Next.js App Router combinando frontend e rotas de API) — não há separação frontend/backend em projetos distintos.

**Performance Goals**: Interações do painel devem responder em menos de 1s para ações de metadados (privacidade, capa); upload deve mostrar resultado por arquivo à medida que cada um é processado (ver SC-001, SC-005 na spec).

**Constraints**: MUST reaproveitar `requireAuth`/`validateToken` sem alterações; MUST NOT introduzir sessão/cookie server-side nova; painel é área admin-only (não precisa otimização de SEO/ISR); single-instance deployment — mutex e cache em memória já assumem isso (ver constitution, Additional Constraints).

**Scale/Scope**: Um único administrador; álbuns com dezenas a poucas centenas de imagens; uploads em lotes pequenos (não otimizados para milhares de arquivos simultâneos — ver Assumptions na spec).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Status |
|---|---|---|
| I. Performance e Otimização de Imagem em Primeiro Lugar | Upload reaproveita `processImage` (Sharp + BlurHash) e `next/image` já usado em toda a galeria; nenhuma imagem é servida sem placeholder/otimização. | PASS |
| II. Segurança de Acesso a Conteúdo Privado | Painel exige sessão válida (via Auth.js + `requireAuth`) em toda ação; senha do administrador fica em env var, sessão assinada localmente; nenhum processo externo entra na cadeia de confiança. | PASS |
| III. Simplicidade para Projeto de Escala Pessoal (YAGNI) | Uma única dependência nova (`next-auth`, biblioteca mantida, evita reimplementar sessão/CSRF à mão — justificado em research.md); upload usa `formData()` nativo, sem biblioteca de upload; nenhuma abstração enterprise introduzida. | PASS |
| IV. Type Safety | Novas rotas e componentes em TypeScript estrito; tipos de request/response documentados em [contracts/](./contracts/); reaproveita `AlbumData`/`ImageData` existentes. | PASS |
| V. Estrutura Consistente de API e Componentes | Nova rota de upload/exclusão de imagem fica em `app/api/albums/[id]/images`, ao lado das demais rotas de álbum; lógica de imagem permanece em `app/lib`; UI nova isolada em `app/admin`. | PASS |

Nenhuma violação identificada — não é necessário preencher Complexity Tracking.

*(Re-check pós Phase 1: mantém-se PASS em todos os itens — o design de dados e contratos não introduziu nenhuma nova dependência, camada ou desvio além do já avaliado acima.)*

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-panel/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
auth.ts                               # NOVO (Amendment) — config do Auth.js (Credentials provider, callbacks)
middleware.ts                         # NOVO (Amendment) — protege /admin/* via o callback authorized

app/
├── admin/
│   ├── layout.tsx                  # Envolve as páginas com o SessionProvider do Auth.js
│   ├── login/page.tsx              # Formulário de usuário/senha (Auth.js Credentials provider)
│   ├── ConfirmDialog.tsx           # Diálogo de confirmação reutilizável (exclusões)
│   ├── page.tsx                    # Lista de álbuns (nome, privacidade, contagem de fotos) — FR-002
│   └── [album_id]/
│       ├── page.tsx                # Server Component: extrai album_id, renderiza o client component
│       └── AdminAlbumClient.tsx    # Upload, capa, privacidade/código, exclusão — FR-003..FR-012
│
├── api/
│   ├── auth/[...nextauth]/route.ts # NOVO (Amendment) — handlers do Auth.js
│   └── albums/
│       └── [id]/
│           └── images/
│               └── route.ts        # NOVO — POST (upload multipart) e DELETE (excluir imagem individual)
│
├── lib/
│   ├── albums.ts                   # Reaproveitado sem mudanças (createAlbum, toggleAlbumPrivacy, deleteAlbum, updateCover, regenerateAlbumCode)
│   ├── images.ts                   # Reaproveitado (deleteImagesByNames, imagesLockKey)
│   ├── image-processing.ts         # processImage passa a ser exportado para reuso pela rota de upload
│   ├── admin-api-client.ts         # Client fetch wrapper; após o Amendment, só trata 401 (cookie de sessão viaja sozinho)
│   └── auth.ts                     # Amendment: requireAuth()/isAuthenticated() agora chamam auth() do Auth.js, não mais Bearer JWT contra JWKS
│
└── types/
    └── AdminUpload.ts               # NOVO — tipo do resultado por arquivo de upload (UploadResult)
```

**Structure Decision**: Projeto único Next.js App Router (sem separação frontend/backend). A área administrativa fica isolada em `app/admin/*` (protegida por `middleware.ts` + sessão Auth.js) e reaproveita quase integralmente as rotas de API já existentes sob `app/api/albums/*`; a única rota nova é `app/api/albums/[id]/images/route.ts`, que fica ao lado das rotas de álbum já existentes, seguindo o padrão de organização já usado no projeto.

## Complexity Tracking

*Nenhuma violação do Constitution Check — seção não aplicável.*
