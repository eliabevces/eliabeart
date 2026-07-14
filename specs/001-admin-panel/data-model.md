# Data Model: Painel de Administração de Álbuns e Imagens

Nenhuma nova entidade persistida é introduzida — a feature reaproveita integralmente os modelos de dados já existentes no sistema (armazenados como JSON no S3). Os únicos tipos novos são formas de resposta/estado usadas apenas pela UI e pela nova rota de upload, não persistidas.

## Entidades existentes (reaproveitadas, sem alteração de esquema)

### Album (`AlbumData`, `app/lib/albums.ts`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `number` | Identificador auto-incremental |
| `nome` | `string` | Nome da pasta no S3; prefixo `_` = importado como privado |
| `descricao` | `string \| null` | |
| `cover` | `string \| null` | Nome do arquivo de imagem usado como capa |
| `privado` | `boolean` | |
| `codigo` | `string \| null` | Código de acesso (hex de 12 chars); só existe quando `privado = true` |

O painel usa este modelo tal como está para a listagem (FR-002), o toggle de privacidade (FR-006/007/008) e a troca de capa (FR-009) — todos via funções já existentes em `app/lib/albums.ts`.

### Imagem (`ImageData`, `app/lib/images.ts`)

| Campo | Tipo | Notas |
|---|---|---|
| `nome` | `string` | Nome do arquivo, sem extensão |
| `descricao` | `string \| null` | |
| `width` | `number \| null` | Preenchido no processamento |
| `height` | `number \| null` | Preenchido no processamento |
| `hash` | `string \| null` | BlurHash, preenchido no processamento |
| `album_id` | `number` | |

Cada imagem enviada pelo painel gera uma nova entrada deste tipo, através do mesmo `processImage` já usado pelo sync automático (ver research.md §3). A exclusão de imagem individual (FR-010) remove a entrada correspondente via `deleteImagesByNames` (já existente).

## Tipos novos (não persistidos — apenas contrato de API/UI)

### `UploadResult` (`app/types/AdminUpload.ts`)

Resultado por arquivo de um upload em lote, retornado pela nova rota `POST /api/albums/[id]/images` e consumido pela UI do painel para mostrar sucesso/falha individual (FR-004).

```ts
export interface UploadResult {
  fileName: string;
  status: "success" | "error";
  error?: string;       // presente apenas quando status = "error"
  image?: ImageData;    // presente apenas quando status = "success"
}
```

### Sessão administrativa (client-side, não persistida no servidor)

Não é uma entidade de dados — é apenas o estado do `keycloak-js` (token de acesso + payload decodificado) mantido em memória no navegador durante a sessão do painel, usado para popular o header `Authorization: Bearer <token>` em toda chamada às rotas protegidas. Nenhum novo campo é adicionado ao JWT já emitido pelo Keycloak; o backend continua validando exatamente como hoje (`app/lib/auth.ts`).

## Validation rules (derivadas dos Functional Requirements)

- Upload (FR-003/004): arquivo MUST ter extensão `.jpg`/`.jpeg`; caso contrário, `UploadResult.status = "error"` para aquele arquivo, sem abortar os demais.
- Exclusão de álbum/imagem (FR-010/011/012): UI MUST exigir uma etapa de confirmação explícita antes de chamar a rota de exclusão — não há validação de dados adicional além da já existente nas rotas reaproveitadas.
- Definir capa (FR-009): a imagem escolhida MUST pertencer ao álbum (validado pela rota `PATCH /api/albums/[id]/cover` já existente, que já resolve o álbum antes de gravar).
