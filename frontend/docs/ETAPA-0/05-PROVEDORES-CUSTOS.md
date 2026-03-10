# PROVEDORES E CUSTOS ESTIMADOS
## Belezza.ai - Infraestrutura e Servicos

---

## 1. WHATSAPP API

### 1.1 Provedor Escolhido: Meta Cloud API (Oficial)

**Justificativa:**
- API oficial da Meta (dona do WhatsApp)
- Maior confiabilidade e compliance
- Sem risco de banimento
- Suporte a templates aprovados

### 1.2 Custos

| Item | Custo |
|------|-------|
| Setup | Gratuito |
| Mensalidade | Gratuito |
| Por conversa (24h) - Utility | $0.0088 (~R$ 0,05) |
| Por conversa (24h) - Marketing | $0.0625 (~R$ 0,35) |
| Por conversa (24h) - Authentication | $0.0315 (~R$ 0,18) |

**Estimativa Mensal (100 saloes ativos):**
- ~3000 conversas utility/mes = R$ 150
- ~500 conversas marketing/mes = R$ 175
- **Total: ~R$ 325/mes**

### 1.3 Configuracao Necessaria
- [ ] Criar Meta Business Account
- [ ] Verificar empresa no Meta Business
- [ ] Criar App no Meta for Developers
- [ ] Solicitar acesso a WhatsApp Business API
- [ ] Configurar numero de telefone dedicado
- [ ] Criar e aprovar templates de mensagem

### 1.4 Variaveis de Ambiente
```env
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

---

## 2. META GRAPH API (Instagram/Facebook)

### 2.1 Provedor: Meta Graph API v19+

**Justificativa:**
- Unica opcao oficial para Instagram Business
- Integracao nativa com Facebook Pages
- API estavel e documentada

### 2.2 Custos

| Item | Custo |
|------|-------|
| Uso da API | Gratuito |
| Rate limits | Baseado em usuarios |

**Limites:**
- 200 chamadas/usuario/hora (padrao)
- 4800 chamadas/usuario/dia

### 2.3 Permissoes Necessarias
```
instagram_basic
instagram_content_publish
instagram_manage_comments
instagram_manage_insights
pages_show_list
pages_read_engagement
pages_manage_posts
```

### 2.4 Configuracao Necessaria
- [ ] Criar Facebook App
- [ ] Configurar Instagram Business Login
- [ ] Configurar Facebook Login
- [ ] Implementar OAuth flow
- [ ] Solicitar revisao do app (producao)

### 2.5 Variaveis de Ambiente
```env
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
```

---

## 3. IA DE IMAGEM

### 3.1 Provedor Principal: Replicate

**Justificativa:**
- API unificada para varios modelos
- Pay-per-use (sem mensalidade)
- Modelos de alta qualidade
- Escalabilidade automatica

### 3.2 Modelos Selecionados

| Funcao | Modelo | Custo/Run |
|--------|--------|-----------|
| Enhance | tencentarc/gfpgan | $0.0023 |
| Remove BG | cjwbw/rembg | $0.0023 |
| Upscale | nightmareai/real-esrgan | $0.0023 |
| Style Transfer | stability-ai/sdxl | $0.0046 |

### 3.3 Estimativa de Custos

**Cenario: 100 saloes PRO (100 processamentos/mes cada)**
- 10.000 processamentos/mes
- Custo medio: $0.003/processamento
- **Total: ~$30/mes (~R$ 165)**

**Cenario: 50 saloes PREMIUM (500 processamentos/mes cada)**
- 25.000 processamentos/mes
- Custo medio: $0.003/processamento
- **Total: ~$75/mes (~R$ 413)**

### 3.4 Provedor Alternativo: Hugging Face Inference API

| Plano | Custo | Limite |
|-------|-------|--------|
| Free | $0 | 1000 requests/dia |
| Pro | $9/mes | Rate limit maior |
| Enterprise | Custom | Dedicated |

### 3.5 Variaveis de Ambiente
```env
REPLICATE_API_TOKEN=
HUGGINGFACE_API_TOKEN=
```

---

## 4. IA DE TEXTO (Legendas)

### 4.1 Provedor Principal: OpenAI GPT-4o-mini

**Justificativa:**
- Excelente qualidade de texto
- Custo acessivel
- Suporte a portugues
- API estavel

### 4.2 Custos OpenAI

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|-------------------|---------------------|
| GPT-4o-mini | $0.15 | $0.60 |
| GPT-4o | $2.50 | $10.00 |

**Estimativa por legenda:**
- ~500 tokens input (prompt + contexto)
- ~300 tokens output (legenda + hashtags)
- Custo: ~$0.0003/legenda (~R$ 0,0017)

**Cenario: 100 saloes PRO (30 legendas/mes)**
- 3.000 legendas/mes
- **Total: ~$0.90/mes (~R$ 5)**

### 4.3 Provedor Alternativo: Anthropic Claude

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|-------------------|---------------------|
| Claude 3 Haiku | $0.25 | $1.25 |
| Claude 3 Sonnet | $3.00 | $15.00 |

### 4.4 Variaveis de Ambiente
```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=
```

---

## 5. STORAGE (Imagens)

### 5.1 Provedor Principal: AWS S3

**Justificativa:**
- Alta durabilidade (99.999999999%)
- Baixo custo
- CDN integrado (CloudFront)
- Escalabilidade ilimitada

### 5.2 Custos AWS S3

| Item | Custo |
|------|-------|
| Armazenamento | $0.023/GB/mes |
| PUT/COPY/POST | $0.005/1000 requests |
| GET | $0.0004/1000 requests |
| Data Transfer Out | $0.09/GB (primeiro 10TB) |

**Estimativa (100 saloes, 2GB cada):**
- Storage: 200GB x $0.023 = $4.60/mes
- Requests: ~50.000/mes = $0.27/mes
- Transfer: ~100GB/mes = $9/mes
- **Total: ~$14/mes (~R$ 77)**

### 5.3 Provedor Alternativo: Cloudinary

| Plano | Custo | Creditos |
|-------|-------|----------|
| Free | $0 | 25 creditos |
| Plus | $89/mes | 225 creditos |
| Advanced | $224/mes | 600 creditos |

*1 credito = 1 transformacao ou 1 GB storage ou 1 GB bandwidth*

### 5.4 Variaveis de Ambiente
```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=belezza-images
AWS_S3_REGION=sa-east-1
AWS_CLOUDFRONT_DOMAIN=
```

---

## 6. BANCO DE DADOS

### 6.1 Provedor: AWS RDS PostgreSQL

**Justificativa:**
- PostgreSQL e robusto e gratuito
- Backups automaticos
- Alta disponibilidade
- Escalabilidade vertical

### 6.2 Custos RDS

| Instancia | vCPU | RAM | Custo/mes |
|-----------|------|-----|-----------|
| db.t3.micro | 2 | 1GB | $15 (free tier) |
| db.t3.small | 2 | 2GB | $29 |
| db.t3.medium | 2 | 4GB | $58 |
| db.m5.large | 2 | 8GB | $140 |

**Recomendacao inicial:** db.t3.small ($29/mes)

### 6.3 Provedor Alternativo: Railway/Render

| Provedor | Plano | Custo |
|----------|-------|-------|
| Railway | Starter | $5/mes + uso |
| Render | Starter | $7/mes |
| Supabase | Free | $0 (500MB) |
| Neon | Free | $0 (512MB) |

### 6.4 Variaveis de Ambiente
```env
DATABASE_URL=postgresql://user:pass@host:5432/belezza
DATABASE_POOL_SIZE=10
```

---

## 7. CACHE (Redis)

### 7.1 Provedor: AWS ElastiCache

| Instancia | RAM | Custo/mes |
|-----------|-----|-----------|
| cache.t3.micro | 0.5GB | $12 |
| cache.t3.small | 1.4GB | $24 |
| cache.t3.medium | 3.2GB | $48 |

**Recomendacao inicial:** cache.t3.micro ($12/mes)

### 7.2 Provedor Alternativo: Upstash

| Plano | Custo | Limite |
|-------|-------|--------|
| Free | $0 | 10K commands/dia |
| Pay-as-you-go | $0.2/100K commands | Ilimitado |

### 7.3 Variaveis de Ambiente
```env
REDIS_URL=redis://host:6379
REDIS_PASSWORD=
```

---

## 8. HOSTING (API Backend)

### 8.1 Provedor: AWS ECS Fargate

| Config | vCPU | RAM | Custo/mes |
|--------|------|-----|-----------|
| Minimo | 0.25 | 0.5GB | ~$9 |
| Recomendado | 0.5 | 1GB | ~$18 |
| Producao | 1 | 2GB | ~$36 |

### 8.2 Provedor Alternativo: Railway

| Plano | Custo | Recursos |
|-------|-------|----------|
| Hobby | $5/mes | 512MB RAM |
| Pro | $20/mes | 8GB RAM |

### 8.3 Provedor Alternativo: Render

| Plano | Custo | Recursos |
|-------|-------|----------|
| Free | $0 | 512MB (sleep) |
| Starter | $7/mes | 512MB |
| Standard | $25/mes | 2GB |

---

## 9. MONITORAMENTO

### 9.1 Logs: AWS CloudWatch
- $0.50/GB ingestao
- $0.03/GB armazenamento
- **Estimativa: ~$10/mes**

### 9.2 APM: Sentry (Error Tracking)
| Plano | Custo | Eventos |
|-------|-------|---------|
| Developer | $0 | 5K/mes |
| Team | $26/mes | 50K/mes |

### 9.3 Metricas: Grafana Cloud
| Plano | Custo | Metricas |
|-------|-------|----------|
| Free | $0 | 10K series |
| Pro | $29/mes | 15K series |

---

## 10. RESUMO DE CUSTOS MENSAIS

### 10.1 Cenario MVP (Lancamento)

| Servico | Provedor | Custo/mes |
|---------|----------|-----------|
| WhatsApp | Meta Cloud API | R$ 50 |
| IA Imagem | Replicate | R$ 30 |
| IA Texto | OpenAI | R$ 5 |
| Storage | AWS S3 | R$ 30 |
| Database | Railway | R$ 30 |
| Cache | Upstash Free | R$ 0 |
| Hosting | Railway | R$ 25 |
| Monitoramento | Sentry Free | R$ 0 |
| **TOTAL** | | **R$ 170/mes** |

### 10.2 Cenario Crescimento (100 saloes)

| Servico | Provedor | Custo/mes |
|---------|----------|-----------|
| WhatsApp | Meta Cloud API | R$ 325 |
| IA Imagem | Replicate | R$ 165 |
| IA Texto | OpenAI | R$ 25 |
| Storage | AWS S3 | R$ 80 |
| Database | AWS RDS | R$ 160 |
| Cache | AWS ElastiCache | R$ 65 |
| Hosting | AWS ECS (2x) | R$ 200 |
| CDN | CloudFront | R$ 50 |
| Monitoramento | Sentry Team | R$ 145 |
| **TOTAL** | | **R$ 1.215/mes** |

### 10.3 Cenario Escala (500 saloes)

| Servico | Provedor | Custo/mes |
|---------|----------|-----------|
| WhatsApp | Meta Cloud API | R$ 1.500 |
| IA Imagem | Replicate | R$ 800 |
| IA Texto | OpenAI | R$ 100 |
| Storage | AWS S3 | R$ 400 |
| Database | AWS RDS (Multi-AZ) | R$ 600 |
| Cache | AWS ElastiCache | R$ 200 |
| Hosting | AWS ECS (4x) | R$ 800 |
| CDN | CloudFront | R$ 250 |
| Load Balancer | AWS ALB | R$ 100 |
| Monitoramento | Datadog | R$ 500 |
| **TOTAL** | | **R$ 5.250/mes** |

---

## 11. ANALISE DE VIABILIDADE

### 11.1 Break-even Analysis

| Cenario | Custo Fixo | Receita Minima | Saloes PRO |
|---------|------------|----------------|------------|
| MVP | R$ 170 | R$ 200 | 4 |
| Crescimento | R$ 1.215 | R$ 1.500 | 30 |
| Escala | R$ 5.250 | R$ 6.000 | 60 |

### 11.2 Margem por Plano

| Plano | Receita | Custo Variavel* | Margem |
|-------|---------|-----------------|--------|
| FREE | R$ 0 | R$ 0 | - |
| PRO | R$ 49,90 | R$ 5 | 90% |
| PREMIUM | R$ 99,90 | R$ 15 | 85% |

*Custo variavel = WhatsApp + IA + Storage proporcional

---

*Documento: T0.3.1 a T0.3.6 - Provedores e Custos*
*Versao: 1.0*
*Data: 05/02/2026*
*Cotacao USD: R$ 5,50*
