# Phase 0 Research: Painel de Administração de Álbuns e Imagens

## 1. Autenticação do painel no navegador

> **Amendment (2026-07-14)**: decisão original revertida — o servidor Keycloak que o projeto usava saiu do ar. Manter uma dependência de um processo externo para autenticar um único administrador não se sustenta (nem a decisão original de reaproveitar Keycloak, nem qualquer outra opção baseada em IdP externo). A decisão abaixo documenta a alternativa adotada; o texto original é preservado em "Alternatives considered" para histórico.

**Decision**: Usar `next-auth` v5 (Auth.js) com um `Credentials` provider (usuário/senha comparados contra `ADMIN_USERNAME`/`ADMIN_PASSWORD` em variáveis de ambiente), sessão JWT assinada localmente (estratégia `session: "jwt"`), e `middleware.ts` protegendo `/admin/*` via o callback `authorized`. O backend não depende de nenhum processo externo — tudo roda dentro do próprio processo Next.js.

**Rationale**: Auth.js é mantido, cuida de CSRF/assinatura de sessão/expiração sem exigir que o projeto reimplemente esses detalhes (evita o extremo oposto do YAGNI — rolar autenticação à mão). Como é um único administrador, um `Credentials` provider local é suficiente; não há necessidade de um IdP externo (Keycloak ou qualquer outro) só para validar um usuário e uma senha. `requireAuth`/`isAuthenticated` (`app/lib/auth.ts`) passam a chamar `auth()` do Auth.js em vez de verificar Bearer JWT contra um JWKS remoto — os call sites nas rotas de API mudaram de `requireAuth(request)` para `requireAuth()`, já que a sessão é lida via cookie (`next/headers`), não via header `Authorization`. Isso também simplificou o cliente: `useAdminApi()` não precisa mais anexar Bearer token manualmente (o cookie de sessão viaja automaticamente em requests same-origin).

**Alternatives considered nesta rodada (2026-07-14)**:
- HTTP Basic Auth via middleware → mais simples ainda (zero tela de login customizada), mas sem expiração/logout de sessão real e mistura mal com as chamadas `fetch()` já existentes no painel.
- Token fixo (API key) comparado por igualdade constante → zero fluxo de login, mas sem expiração/renovação de sessão.
- Senha + JWT local via `jose` (sem biblioteca) → equivalente em espírito ao Auth.js, mas reimplementaria manualmente cookie/CSRF/expiração que o Auth.js já resolve.
- **Escolhido**: Auth.js — melhor equilíbrio entre não depender de processo externo e não reimplementar primitivas de sessão à mão.

**Alternatives considered (decisão original, revertida)**:
- Implementar o fluxo OAuth2 Authorization Code manualmente → rejeitado: reimplementa redirect/refresh/PKCE que o adaptador oficial já resolve, custo de manutenção maior para um projeto pessoal.
- NextAuth.js (Auth.js) com provider Keycloak → rejeitado à época: traria sua própria camada de sessão/cookies que colidiria com o `requireAuth` (Bearer JWT puro). **Nota**: esse trade-off deixou de existir ao abandonar o Keycloak — Auth.js com Credentials provider não tem esse conflito, pois substitui o mecanismo de auth por completo em vez de coexistir com ele.
- Cookie de sessão server-side (novo) → rejeitado à época por introduzir um mecanismo que não existia; hoje é exatamente o mecanismo adotado (via Auth.js), já que o Bearer/Keycloak deixou de ser uma opção viável.

## 2. Upload de arquivos (multipart) em Next.js App Router

**Decision**: Usar `request.formData()` nativo do Route Handler para receber `multipart/form-data` — sem biblioteca de upload adicional. No cliente, um `<input type="file" multiple>` simples + `fetch` com `FormData`.

**Rationale**: Volume de uso é de escala pessoal (dezenas a poucas centenas de arquivos por vez, não milhares simultâneos — ver Assumptions da spec). Next.js Route Handlers já suportam `formData()` nativamente desde o App Router; nenhuma dependência nova é necessária, consistente com o princípio de Simplicidade (YAGNI).

**Alternatives considered**:
- Biblioteca de upload com progresso/chunking (ex.: `react-dropzone` + upload resumível) → rejeitado por ora: complexidade desnecessária para o volume esperado; pode ser revisitado como melhoria futura se o uso real mostrar necessidade.

## 3. Processamento da imagem enviada

**Decision**: Ao receber um arquivo, gravá-lo no S3 via `putObject`/`imageKey` (`app/lib/s3.ts`, já existentes) e então reutilizar a mesma função de processamento de imagem já usada pelo sync automático (`processImage`, hoje interna a `app/lib/image-processing.ts`) para gerar dimensões e blurhash e anexar a entrada em `images.json`. `processImage` será exportado (deixa de ser privada do módulo) para poder ser chamada a partir da nova rota de upload.

**Rationale**: Reaproveita 100% da lógica de processamento já testada em produção (mesmo código que processa imagens sincronizadas do bucket), evitando um segundo caminho de processamento divergente. Consistente com o Princípio I (performance/otimização de imagem) e V (estrutura consistente — lógica de imagem permanece centralizada em `app/lib`).

**Alternatives considered**:
- Processar a imagem em memória antes de subir ao S3, sem reler do S3 → mais rápido (evita 1 round-trip), mas duplicaria a lógica de `processImage` (que hoje sempre lê do S3). Para o volume de uso pessoal esperado, a diferença de latência é desprezível; manter uma única implementação é priorizado (Simplicidade/YAGNI).

## 4. Validação de formato

**Decision**: Aceitar apenas arquivos `.jpg`/`.jpeg` no upload, rejeitando outros formatos com erro por arquivo (sem interromper o lote). Isso é consistente com o sistema hoje: `listAlbumImages` e `imageKey` já assumem extensão `.jpg` em todo o pipeline existente.

**Rationale**: Introduzir conversão automática de formato (PNG→JPEG, HEIC→JPEG etc.) está fora do escopo definido na spec ("Uploads são de arquivos de imagem já no formato aceito pelo sistema hoje"). Aceitar apenas o formato já suportado evita inconsistência silenciosa com o restante do pipeline (que filtra estritamente por `.jpg`).

**Alternatives considered**:
- Converter automaticamente outros formatos para JPEG via Sharp no upload → rejeitado para esta feature: expande escopo além do que a spec define; pode virar uma melhoria futura independente.

## 5. Consistência e concorrência

**Decision**: A nova rota de upload e a nova rota de exclusão de imagem individual reaproveitam o `jsonMutex` por álbum (`imagesLockKey`, adicionado em `app/lib/concurrency.ts` na sessão de performance) ao escrever `images.json`, e o cache por álbum (`cache.delete(\`album_${albumId}_images\`)`) já usado pelas rotas existentes.

**Rationale**: Mantém a mesma garantia de ausência de lost-updates já aplicada a `processAlbumImages`/`deleteImagesByNames`; upload e exclusão pelo painel passam a ser apenas mais um consumidor do mesmo mecanismo, sem introduzir um novo esquema de bloqueio.

**Alternatives considered**: nenhuma — reaproveitar a infraestrutura já existente é a única opção considerada, dado que ela foi construída exatamente para este tipo de escrita concorrente em JSON no S3.

## Resolved unknowns

Nenhum item ficou como `NEEDS CLARIFICATION` no Technical Context do plano — todas as decisões acima resolvem os pontos técnicos em aberto da spec com base em padrões já estabelecidos no próprio projeto.
