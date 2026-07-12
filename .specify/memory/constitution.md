<!--
Sync Impact Report
- Version change: [TEMPLATE] → 1.0.0 (initial ratification)
- Modified principles: n/a (first concrete adoption, template placeholders replaced)
- Added sections: Performance e Otimização de Imagem em Primeiro Lugar; Segurança de Acesso a
  Conteúdo Privado; Simplicidade para Projeto de Escala Pessoal (YAGNI); Type Safety;
  Estrutura Consistente de API e Componentes; Additional Constraints; Development Workflow
- Removed sections: none
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (generic "Constitution Check" gate references
    the constitution file, no changes needed)
  - ✅ .specify/templates/spec-template.md (technology-agnostic, no changes needed)
  - ✅ .specify/templates/tasks-template.md (generic task categories still apply)
  - ✅ .claude/skills/speckit-*/SKILL.md (agent-agnostic, no hardcoded principle refs found)
  - ⚠ README.md (pending manual follow-up: consider referencing the constitution once
    the first feature spec is created under specs/)
- Follow-up TODOs: none
-->

# EliabeArt Interface Constitution

## Core Principles

### I. Performance e Otimização de Imagem em Primeiro Lugar
Todo carregamento de imagem DEVE usar o componente `next/image`; placeholders BlurHash
são obrigatórios para qualquer imagem carregada de forma assíncrona; o processamento
de imagem (redimensionamento, conversão de formato) DEVE ocorrer no servidor via Sharp,
nunca no cliente. Nenhuma mudança pode introduzir regressão mensurável em Core Web Vitals
(LCP, CLS) nas páginas de álbum e visualização de imagem.
**Rationale**: este é o propósito central do projeto — estudar e demonstrar as melhores
práticas de entrega de imagens performática; qualquer atalho aqui contradiz o objetivo do produto.

### II. Segurança de Acesso a Conteúdo Privado
Álbuns privados DEVEM ser validados exclusivamente no servidor, combinando código de
acesso e verificação de JWT (`jose`); a validação de acesso NUNCA pode depender
somente de lógica no cliente. Credenciais AWS S3, segredos de assinatura JWT e chaves
de API MUST NOT ser expostos em código cliente, logs ou respostas de API. Rotas de API
sob `app/api` que servem conteúdo privado DEVEM verificar a sessão/token antes de
qualquer acesso ao S3.
**Rationale**: o modelo de autenticação do projeto depende inteiramente de controles
no backend (ver README, seção "Authentication Model"); vazamento de segredos ou bypass
client-side quebra a única camada de proteção existente.

### III. Simplicidade para Projeto de Escala Pessoal (YAGNI)
Este é um projeto pessoal de estudo, não um produto multiusuário. Funcionalidades,
abstrações ou dependências DEVEM resolver uma necessidade real e presente — não uma
necessidade hipotética de escala futura. Sistemas de cadastro/autenticação de usuários,
camadas de abstração enterprise (ex.: repository pattern desnecessário, microsserviços)
e dependências novas exigem justificativa explícita antes de serem adicionadas.
**Rationale**: complexidade desnecessária aumenta o custo de manutenção de um projeto
mantido por uma pessoa e distrai do objetivo de estudar performance de imagens.

### IV. Type Safety
TypeScript em modo estrito é obrigatório em todo o código sob `app/`. O uso de `any`
implícito ou explícito DEVE ser evitado; quando inevitável, DEVE vir acompanhado de
comentário explicando o motivo. Tipos e contratos de dados compartilhados (respostas de
API, entidades de álbum/imagem) DEVEM ser centralizados em `app/types`.
**Rationale**: mantém a integração entre rotas de API, componentes e o SDK da AWS
verificável em tempo de compilação, reduzindo bugs de contrato em um projeto sem testes automatizados extensos.

### V. Estrutura Consistente de API e Componentes
Rotas de API sob `app/api` DEVEM seguir convenções REST previsíveis (verbo HTTP
correspondente à ação, recursos no plural, uso de parâmetros dinâmicos para IDs).
Lógica de acesso a dados e integrações externas (S3, JWT) DEVE residir em `app/lib`,
nunca duplicada dentro de componentes ou rotas. Componentes de UI reutilizáveis DEVEM
residir em `app/components`; componentes específicos de uma única rota podem viver
localmente à rota.
**Rationale**: preserva a navegabilidade do código à medida que novas features
(álbuns, upload, download, random photo) são adicionadas, evitando duplicação de lógica de integração sensível.

## Additional Constraints

- **Stack obrigatória**: Next.js (App Router) + TypeScript + Tailwind CSS; mudanças de
  framework ou de biblioteca de estilos exigem atualização desta constitution.
- **Armazenamento**: AWS S3 é o armazenamento de imagens canônico via `@aws-sdk/client-s3`;
  qualquer alternativa de storage exige justificativa e atualização do Princípio II.
- **Deploy**: a aplicação DEVE permanecer executável via Docker/`docker-compose`
  (`Dockerfile`, `docker-compose.yml`) como caminho de deploy suportado.
- **Variáveis de ambiente**: segredos e endpoints DEVEM ser configurados via `.env`
  (nunca commitados); `.env.example` DEVE ser mantido atualizado com as chaves necessárias.

## Development Workflow

- Alterações que tocam álbuns privados, verificação de código de acesso ou emissão/validação
  de JWT DEVEM ser revisadas com atenção redobrada quanto ao Princípio II antes do merge.
- Alterações que tocam o pipeline de renderização de imagem (upload, Sharp, BlurHash,
  `next/image`) DEVEM ser validadas manualmente no navegador (dev server) antes de serem
  consideradas concluídas, conforme o Princípio I.
- `npm run lint` DEVE passar antes de qualquer merge.
- Novas dependências DEVEM ser justificadas em relação ao Princípio III (Simplicidade/YAGNI).

## Governance

Esta constitution tem precedência sobre outras práticas e convenções informais do projeto.
Emendas exigem: (1) documentação da mudança e motivação, (2) atualização do número de
versão conforme versionamento semântico (MAJOR para remoção/redefinição incompatível de
princípios, MINOR para adição de princípio ou seção, PATCH para esclarecimentos), e
(3) verificação de que os templates em `.specify/templates/` permanecem consistentes com
os princípios atualizados. Revisões de PR/mudanças significativas DEVEM verificar
conformidade com os princípios acima; complexidade que viole o Princípio III DEVE ser
justificada explicitamente na descrição da mudança.

**Version**: 1.0.0 | **Ratified**: 2026-07-12 | **Last Amended**: 2026-07-12
