# Feature Specification: Painel de Administração de Álbuns e Imagens

**Feature Branch**: `001-admin-panel`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Criar um painel de administração em /admin para gerenciar álbuns e imagens do EliabeArt, protegido por login Keycloak (reaproveitando o mecanismo de autenticação já usado em requireAuth nas rotas app/api/albums/*). O painel deve permitir: (1) listar todos os álbuns, incluindo privados, com contagem de fotos; (2) fazer upload de novas imagens para um álbum — funcionalidade que hoje não existe, já que imagens só entram via sync direto do bucket S3; (3) definir a foto de capa de um álbum; (4) alternar um álbum entre público/privado e regenerar o código de acesso; (5) deletar álbuns inteiros e imagens individuais. Prioridades: upload de imagens e alternar privacidade são as ações mais frequentes (P1); definir capa é P2; deletar é P3. Sem sessão Keycloak válida, o painel deve redirecionar para login ou mostrar 401. Fora de escopo: gerenciar usuários/permissões do Keycloak, editar metadados EXIF."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload de novas imagens para um álbum (Priority: P1)

Como administrador do EliabeArt, quero enviar novas fotos diretamente para um álbum existente através do painel, para não depender de acesso manual ao armazenamento sempre que eu quiser adicionar fotos.

**Why this priority**: É a ação mais frequente hoje e a única que atualmente não tem nenhum caminho alternativo dentro do app — sem ela, o administrador continua dependendo de ferramentas externas para adicionar conteúdo.

**Independent Test**: Pode ser testado fazendo login no painel, selecionando um álbum existente, enviando um ou mais arquivos de imagem, e verificando que eles aparecem na galeria pública/privada do álbum em seguida.

**Acceptance Scenarios**:

1. **Given** o administrador está autenticado e em um álbum existente, **When** ele seleciona e envia uma imagem válida, **Then** a imagem é processada e passa a aparecer na listagem do álbum.
2. **Given** o administrador tenta enviar um arquivo em formato não suportado, **When** o upload é submetido, **Then** o sistema rejeita o arquivo e exibe uma mensagem de erro clara, sem afetar as demais imagens do álbum.
3. **Given** o administrador envia várias imagens de uma vez, **When** o upload é concluído, **Then** todas as imagens válidas são adicionadas e o painel mostra o resultado por arquivo (sucesso/falha).

---

### User Story 2 - Alternar privacidade e gerenciar código de acesso (Priority: P1)

Como administrador, quero tornar um álbum público ou privado e regenerar o código de acesso a qualquer momento pelo painel, para controlar quem pode ver cada álbum sem precisar chamar a API manualmente.

**Why this priority**: Junto ao upload, é a ação mais frequente no fluxo atual (hoje feita por chamadas manuais à API), e tem impacto direto na privacidade do conteúdo.

**Independent Test**: Pode ser testado alternando um álbum público para privado pelo painel e confirmando que o código gerado realmente bloqueia acesso não autenticado ao álbum na interface pública; e o inverso, tornando-o público novamente.

**Acceptance Scenarios**:

1. **Given** um álbum público, **When** o administrador marca o álbum como privado, **Then** um novo código de acesso é gerado e exibido no painel, e o álbum passa a exigir esse código na interface pública.
2. **Given** um álbum privado, **When** o administrador solicita "regenerar código", **Then** um novo código substitui o anterior e o código antigo deixa de funcionar.
3. **Given** um álbum privado, **When** o administrador marca o álbum como público, **Then** o código de acesso é removido e o álbum passa a ser visível sem restrição.

---

### User Story 3 - Definir a foto de capa do álbum (Priority: P2)

Como administrador, quero escolher qual foto representa a capa de um álbum pelo painel, para destacar a melhor imagem na listagem pública sem depender da ordem de upload.

**Why this priority**: Melhora a apresentação dos álbuns, mas não bloqueia o uso básico do sistema — pode ser entregue depois do upload e da privacidade estarem prontos.

**Independent Test**: Pode ser testado selecionando uma imagem existente de um álbum como nova capa e confirmando que ela passa a aparecer no card do álbum na home.

**Acceptance Scenarios**:

1. **Given** um álbum com múltiplas imagens, **When** o administrador seleciona uma imagem diferente como capa, **Then** essa imagem passa a ser exibida como capa do álbum na listagem pública.

---

### User Story 4 - Excluir álbuns e imagens individuais (Priority: P3)

Como administrador, quero excluir um álbum inteiro ou imagens específicas dentro de um álbum pelo painel, para remover conteúdo que não deve mais ficar disponível.

**Why this priority**: É uma ação destrutiva e menos frequente que as demais; importante para o ciclo de vida completo do conteúdo, mas não crítica para o uso diário.

**Independent Test**: Pode ser testado excluindo uma imagem de um álbum de teste e confirmando que ela some da galeria e não é mais acessível; e excluindo um álbum inteiro e confirmando que ele some da listagem.

**Acceptance Scenarios**:

1. **Given** um álbum com imagens, **When** o administrador exclui uma imagem específica, **Then** o sistema pede confirmação antes de excluir, e após confirmar, a imagem some da listagem do álbum e não é mais acessível.
2. **Given** um álbum existente, **When** o administrador exclui o álbum inteiro, **Then** o sistema pede confirmação explícita antes de excluir, e após confirmar, o álbum e todas as suas imagens deixam de existir no sistema.

---

### Edge Cases

- O que acontece se a sessão de administrador expirar no meio de um upload ou de uma exclusão? O sistema deve rejeitar a ação com erro de autenticação e o painel deve redirecionar para login, sem completar a ação parcialmente.
- O que acontece se duas sessões de administrador editarem o mesmo álbum ao mesmo tempo (ex.: uma exclui uma imagem enquanto a outra faz upload)? O sistema deve preservar a consistência dos dados do álbum, sem perder nem duplicar entradas.
- O que acontece se o administrador tentar excluir um álbum ou imagem que já foi excluído em outra sessão? O sistema deve informar que o item não existe mais, sem apresentar um erro genérico.
- O que acontece ao tentar definir como capa uma imagem que não pertence ao álbum? O sistema deve rejeitar a operação.
- O que acontece se o upload incluir um arquivo muito grande ou corrompido? O sistema deve rejeitar esse arquivo individualmente com mensagem clara, sem interromper o upload dos demais arquivos do lote.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST exigir uma sessão de administrador válida (reaproveitando o mecanismo de autenticação já usado nas demais rotas protegidas do sistema) para acessar qualquer página ou ação do painel; sem sessão válida, o usuário MUST ser redirecionado para o login ou receber um erro de acesso negado.
- **FR-002**: O painel MUST listar todos os álbuns existentes, incluindo os privados, exibindo nome, status de privacidade e quantidade de fotos de cada um.
- **FR-003**: O sistema MUST permitir que o administrador envie uma ou mais imagens para um álbum existente a partir do painel.
- **FR-004**: O sistema MUST validar cada imagem enviada e informar o resultado do upload por arquivo, sem que a falha de um arquivo impeça o sucesso dos demais.
- **FR-005**: Após um upload bem-sucedido, o sistema MUST preparar a imagem para exibição otimizada (dimensões corretas e uma prévia leve de carregamento) e torná-la imediatamente visível na listagem do álbum.
- **FR-006**: O sistema MUST permitir alternar um álbum entre público e privado a partir do painel.
- **FR-007**: Ao tornar um álbum privado, o sistema MUST gerar um novo código de acesso e exibi-lo ao administrador no painel.
- **FR-008**: O sistema MUST permitir regenerar o código de acesso de um álbum privado a qualquer momento, invalidando o código anterior imediatamente.
- **FR-009**: O sistema MUST permitir que o administrador escolha qualquer imagem existente de um álbum como sua capa.
- **FR-010**: O sistema MUST permitir excluir uma imagem individual de um álbum, mediante confirmação explícita do administrador antes da exclusão definitiva.
- **FR-011**: O sistema MUST permitir excluir um álbum inteiro, incluindo todas as suas imagens, mediante confirmação explícita do administrador antes da exclusão definitiva.
- **FR-012**: O sistema MUST impedir que ações destrutivas (exclusão de álbum ou imagem) sejam executadas sem uma etapa de confirmação separada da ação inicial.
- **FR-013**: O painel MUST NOT oferecer gerenciamento de usuários ou permissões de autenticação, nem edição de metadados técnicos (ex.: EXIF) das imagens — esses itens estão fora do escopo desta feature.

### Key Entities

- **Álbum**: coleção nomeada de imagens; possui identificador, nome, descrição opcional, imagem de capa, status de privacidade e código de acesso (quando privado).
- **Imagem**: arquivo de foto pertencente a um álbum; possui nome, dimensões e um identificador usado para gerar uma prévia leve durante o carregamento.
- **Sessão administrativa**: contexto autenticado que autoriza as ações do painel; reaproveita a sessão de autenticação já usada nas rotas protegidas existentes, sem introduzir um novo conceito de usuário.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um administrador consegue adicionar novas fotos a um álbum existente em menos de 2 minutos, sem usar nenhuma ferramenta fora do navegador.
- **SC-002**: 100% das tentativas de acessar o painel sem sessão válida são bloqueadas e redirecionadas para autenticação.
- **SC-003**: Um administrador consegue alternar a privacidade de um álbum e obter o novo código de acesso em menos de 30 segundos.
- **SC-004**: Nenhuma ação destrutiva (exclusão de álbum ou imagem) ocorre sem uma etapa de confirmação explícita — a taxa de exclusões acidentais reportadas é zero após o lançamento.
- **SC-005**: Após um upload bem-sucedido, a nova imagem aparece na galeria pública/privada correspondente em até 1 minuto.

## Assumptions

- O administrador é uma única pessoa (o dono do projeto); o painel não precisa diferenciar múltiplos níveis de permissão entre administradores.
- O mecanismo de login do painel reaproveita o fluxo de autenticação já existente no sistema; nenhum novo sistema de autenticação é criado.
- Uploads são de arquivos de imagem já no formato aceito pelo sistema hoje; conversão de outros formatos está fora de escopo.
- O volume de imagens por upload e por álbum é de escala pessoal (dezenas a poucas centenas), não exigindo upload em massa otimizado para milhares de arquivos simultâneos.
- A contagem de fotos exibida na listagem de álbuns pode ser obtida a partir dos dados já mantidos pelo sistema para cada álbum.
