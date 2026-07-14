# Quickstart: Validando o Painel de Administração

> **Amendment (2026-07-14)**: autenticação migrada de Keycloak para Auth.js (Credentials provider local). Pré-requisitos e passo de login atualizados abaixo.

Pré-requisitos: servidor rodando localmente (`npm run dev`) com `.env` configurado (S3/MinIO acessível, `AUTH_SECRET` definido e `ADMIN_USERNAME`/`ADMIN_PASSWORD` configurados com um valor de sua escolha).

## 1. Bloqueio sem autenticação (FR-001, SC-002)

1. Acesse `/admin` sem estar logado.
2. **Esperado**: `middleware.ts` redireciona para `/admin/login?callbackUrl=...`, sem exibir nenhum dado de álbum.

## 2. Listagem de álbuns (FR-002)

1. Faça login em `/admin/login` com `ADMIN_USERNAME`/`ADMIN_PASSWORD` configurados no `.env`.
2. **Esperado**: `/admin` lista todos os álbuns (incluindo os privados, marcados como tal) com a contagem de fotos de cada um.

## 3. Upload de imagens (FR-003, FR-004, FR-005, SC-001, SC-005)

1. Abra um álbum existente no painel e envie 2–3 arquivos `.jpg` válidos e 1 arquivo em formato inválido (ex.: `.png`) no mesmo lote.
2. **Esperado**: os arquivos `.jpg` são aceitos e aparecem na lista de resultados como sucesso; o arquivo inválido aparece como erro, sem impedir os demais.
3. Abra a galeria pública do álbum (`/album/{id}`).
4. **Esperado**: as novas imagens aparecem na galeria em até 1 minuto, com blur placeholder e dimensões corretas.

## 4. Privacidade e código de acesso (FR-006, FR-007, FR-008, SC-003)

1. Marque um álbum público como privado pelo painel.
2. **Esperado**: um código de acesso é exibido; acessar `/album/{id}` sem esse código pede o código de acesso.
3. Clique em "regenerar código".
4. **Esperado**: o código antigo deixa de funcionar em `/album/{id}`; o novo código funciona.
5. Marque o álbum de volta como público.
6. **Esperado**: `/album/{id}` fica acessível sem código.

## 5. Capa do álbum (FR-009)

1. Escolha uma imagem diferente como capa do álbum pelo painel.
2. **Esperado**: a home (`/`) passa a mostrar essa imagem como capa do card do álbum.

## 6. Exclusão com confirmação (FR-010, FR-011, FR-012, SC-004)

1. Tente excluir uma imagem sem confirmar (ex.: feche o diálogo de confirmação).
2. **Esperado**: nada é excluído.
3. Exclua uma imagem confirmando a ação.
4. **Esperado**: a imagem some da galeria pública do álbum e da lista no painel.
5. Repita o teste 1–2 para exclusão de um álbum inteiro de teste.
6. **Esperado**: o álbum some da home e do painel; sem confirmação, nada é excluído.

## 7. Concorrência (Edge case da spec)

1. Em duas abas autenticadas, faça upload de uma imagem em uma aba enquanto exclui outra imagem do mesmo álbum na outra aba, o mais próximo possível no tempo.
2. **Esperado**: `images.json` do álbum permanece consistente ao final — nenhuma entrada duplicada nem perdida (validado inspecionando `GET /api/images/{album_id}` após as duas operações).
