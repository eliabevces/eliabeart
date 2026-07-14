# API Contract: Painel de Administração

Todas as rotas abaixo exigem `Authorization: Bearer <token>` válido (verificado por `requireAuth`); sem token válido, `401 { "error": "Unauthorized" }`.

## Rotas novas

### `POST /api/albums/{id}/images`

Envia uma ou mais imagens para o álbum `{id}` (FR-003, FR-004, FR-005).

- **Request**: `multipart/form-data`, campo repetível `files` (um ou mais arquivos).
- **Response `200`**:
  ```json
  {
    "results": [
      { "fileName": "foto1.jpg", "status": "success", "image": { "nome": "foto1", "width": 1920, "height": 1080, "hash": "...", "album_id": 3, "descricao": null } },
      { "fileName": "foto2.png", "status": "error", "error": "Formato não suportado (apenas .jpg/.jpeg)" }
    ]
  }
  ```
- **Response `404`**: álbum não encontrado.
- **Response `400`**: nenhum arquivo enviado.

### `DELETE /api/albums/{id}/images`

Exclui uma imagem individual do álbum `{id}` (FR-010).

- **Request body**: `{ "imageName": "foto1" }`
- **Response `200`**: `{ "message": "Imagem excluída com sucesso" }`
- **Response `404`**: álbum ou imagem não encontrados.

## Rotas reaproveitadas (sem alteração)

| Rota | Uso no painel |
|---|---|
| `GET /api/albums/{id}` (com Bearer) | Detalhe do álbum, incluindo `codigo` quando privado — base da tela de detalhe |
| `GET /api/images/{album_id}` | Lista de imagens do álbum, para contagem (FR-002) e grade de gerenciamento |
| `PATCH /api/albums/{id}/cover` | Definir capa (FR-009) — body `{ "image": "nome" }` |
| `POST /api/albums/{id}/privacy` | Alternar público/privado e regenerar código (FR-006, FR-007, FR-008) — body `{ "privado"?: boolean, "regenerate"?: boolean }` |
| `DELETE /api/albums/{id}` | Excluir álbum inteiro (FR-011) |

## Fora do contrato desta feature

- `POST /api/albums` e `POST /api/albums/{id}/update` (resync com o bucket S3) continuam existindo como caminho de reconciliação para mudanças feitas fora do painel (upload direto no bucket); o painel não os substitui, apenas oferece um caminho direto adicional.
