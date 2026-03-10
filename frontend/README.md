# Social Studio IA

Sistema de criação e gestão de conteúdo para redes sociais com inteligência artificial.

## Tecnologias

- **Framework**: Next.js 15 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4
- **Testes**: Jest + React Testing Library
- **PWA**: next-pwa

## Requisitos

- Node.js 20+
- npm 10+

## Instalação

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/social-studio-ia.git
cd social-studio-ia

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas configurações

# Iniciar em desenvolvimento
npm run dev
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Compila para produção |
| `npm start` | Inicia o servidor de produção |
| `npm run lint` | Executa o ESLint |
| `npm test` | Executa os testes |
| `npm run test:watch` | Executa testes em modo watch |
| `npm run test:coverage` | Executa testes com cobertura |

## Variáveis de Ambiente

Crie um arquivo `.env.local` baseado no `.env.example`:

```env
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3001/api
API_SECRET_KEY=your-secret-key

# Autenticação
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# IA - Processamento de Imagem
IMAGE_AI_API_URL=
IMAGE_AI_API_KEY=

# IA - Geração de Texto
TEXT_AI_API_URL=
TEXT_AI_API_KEY=

# Facebook/Meta API
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_ACCESS_TOKEN=

# Instagram API
INSTAGRAM_BUSINESS_ACCOUNT_ID=

# Upload de Imagens
UPLOAD_MAX_SIZE_MB=10
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Monitoramento (opcional)
SENTRY_DSN=
LOG_LEVEL=info
```

## Deploy

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente no dashboard
3. Deploy automático a cada push na branch main

```bash
# Deploy manual via CLI
npm i -g vercel
vercel
```

### Docker

```bash
# Build da imagem
docker build -t social-studio-ia .

# Executar container
docker run -p 3000:3000 --env-file .env.local social-studio-ia

# Ou usando docker-compose
docker-compose up -d
```

### CI/CD

O projeto inclui workflows do GitHub Actions:

- **CI** (`.github/workflows/ci.yml`): Lint, testes e build em PRs
- **Deploy** (`.github/workflows/deploy.yml`): Deploy automático para Vercel

#### Secrets Necessários no GitHub:

| Secret | Descrição |
|--------|-----------|
| `VERCEL_TOKEN` | Token de acesso do Vercel |
| `VERCEL_ORG_ID` | ID da organização no Vercel |
| `VERCEL_PROJECT_ID` | ID do projeto no Vercel |
| `CODECOV_TOKEN` | Token do Codecov (opcional) |

## Monitoramento

### Health Check

Endpoint de verificação de saúde disponível em `/api/health`:

```bash
curl http://localhost:3000/api/health
```

Resposta:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0",
  "environment": "production",
  "uptime": 3600,
  "checks": [
    { "name": "environment", "status": "pass" },
    { "name": "memory", "status": "pass" },
    { "name": "responseTime", "status": "pass" }
  ]
}
```

### Logging

O sistema utiliza logging estruturado com níveis:
- `debug`: Informações detalhadas para debugging
- `info`: Informações gerais de operação
- `warn`: Avisos sobre situações inesperadas
- `error`: Erros que precisam de atenção

Configure o nível via `LOG_LEVEL` no ambiente.

### Error Tracking

Integração com Sentry disponível. Configure `SENTRY_DSN` para ativar.

## Estrutura do Projeto

```
src/
├── app/                  # App Router (páginas e rotas)
│   ├── admin/           # Área administrativa
│   ├── api/             # API Routes
│   └── login/           # Página de login
├── components/          # Componentes React
│   ├── ui/              # Componentes de UI base
│   └── ...              # Componentes específicos
├── contexts/            # Contextos React
├── hooks/               # Custom hooks
├── lib/                 # Utilitários e configurações
├── services/            # Serviços de API
└── types/               # Tipos TypeScript
```

## Testes

```bash
# Executar todos os testes
npm test

# Modo watch
npm run test:watch

# Com cobertura
npm run test:coverage
```

Cobertura mínima configurada: 50%

## Segurança

O projeto implementa:
- Headers de segurança (HSTS, XSS Protection, etc.)
- Validação de ambiente
- Autenticação JWT
- Proteção de rotas via middleware

## Licença

Proprietário - Todos os direitos reservados.
