# Guia Completo de Testes - Belezza API

Este guia fornece instruções detalhadas para compilar e executar todos os testes do projeto.

## 🔧 Pré-requisitos

- **Java 21** ou superior
- **Maven 3.9+** (incluído via Maven Wrapper)
- **Docker** (para testes de integração com Testcontainers)
- **4GB+ RAM** recomendado
- **Conexão com internet** (para baixar dependências)

## 🚀 Opções de Execução

### Opção 1: Usando PowerShell (Recomendado para Windows)

```powershell
# Abra PowerShell na pasta do projeto
cd "c:\Users\Rogerio Martins\Nova pasta\Belezza.ai\belezza-api"

# Execute o script interativo
.\run-tests.ps1
```

### Opção 2: Usando Maven Wrapper Diretamente

```cmd
# Compilar o projeto
.\mvnw.cmd clean compile

# Rodar testes unitários
.\mvnw.cmd test

# Rodar todos os testes (unitários + integração)
.\mvnw.cmd verify

# Gerar relatório de cobertura
.\mvnw.cmd clean test
# Abra: target\site\jacoco\index.html
```

### Opção 3: Usando Script Batch Customizado

```cmd
# Compilar apenas
.\build.bat "clean compile"

# Compilar e testar
.\build.bat "clean test"

# Verificação completa
.\build.bat "clean verify"
```

### Opção 4: Usando IDE (IntelliJ IDEA ou Eclipse)

#### IntelliJ IDEA:
1. Abra o projeto como projeto Maven
2. Aguarde a indexação e download de dependências
3. Botão direito em `src/test/java` → **Run 'All Tests'**
4. Para cobertura: **Run 'All Tests' with Coverage**

#### Eclipse:
1. Importe como projeto Maven existente
2. Aguarde a sincronização
3. Botão direito no projeto → **Run As** → **JUnit Test**

#### VS Code:
1. Instale extensões: **Java Extension Pack**, **Maven for Java**
2. Abra o projeto
3. Use o painel **Testing** para rodar testes

## 📝 Tipos de Testes

### 1. Testes Unitários

**Localização:** `src/test/java/com/belezza/api/service/*Test.java`

**Descrição:** Testam lógica de negócio isoladamente usando mocks.

**Arquivos:**
- `MetricasAgendamentoServiceTest.java` - Testes de métricas de agendamento
- `MetricasFinanceirasServiceTest.java` - Testes de métricas financeiras
- `MetricasSocialServiceTest.java` - Testes de métricas sociais
- `AuthServiceTest.java` - Testes de autenticação (existente)

**Comando:**
```cmd
.\mvnw.cmd test
```

**Duração esperada:** ~30 segundos

### 2. Testes de Integração

**Localização:** `src/test/java/com/belezza/api/**/*IT.java`

**Descrição:** Testam componentes integrados com banco de dados real (Testcontainers).

**Arquivos:**
- `AgendamentoRepositoryIT.java` - Testes de repositório com PostgreSQL
- `MetricasControllerIT.java` - Testes de controller end-to-end

**Comando:**
```cmd
.\mvnw.cmd verify
```

**Duração esperada:** ~2-3 minutos (inclui inicialização do Docker)

**Requisitos:**
- Docker Desktop rodando
- Porta 5432 disponível

### 3. Testes de Segurança

**Localização:** `src/test/java/com/belezza/api/security/*Test.java`

**Descrição:** Testam autenticação JWT, autorização e controle de acesso.

**Arquivos:**
- `JwtSecurityTest.java` - Testes de JWT e roles

**Comando:**
```cmd
.\mvnw.cmd test -Dtest=JwtSecurityTest
```

### 4. Testes de Carga (Gatling)

**Localização:** `src/test/scala/com/belezza/api/performance/*.scala`

**Descrição:** Testes de performance e carga.

**Arquivos:**
- `BasicSimulation.scala` - Cenários básicos de carga

**Comando:**
```cmd
.\mvnw.cmd gatling:test

# Com parâmetros customizados
.\mvnw.cmd gatling:test -Dusers=200 -Dduration=300
```

**Requisitos:**
- API rodando em localhost:8080
- Ou configure: `-DbaseUrl=http://seu-servidor`

## 🐛 Troubleshooting

### Problema: "Could not find or load main class"

**Causa:** Caminho com espaços no Windows.

**Solução:**
```cmd
# Use o script build.bat que lida com espaços
.\build.bat "clean compile"

# Ou mova o projeto para caminho sem espaços
```

### Problema: "Docker not running"

**Causa:** Testcontainers precisa do Docker para testes de integração.

**Solução:**
```cmd
# Inicie o Docker Desktop

# Ou pule testes de integração
.\mvnw.cmd test -DskipITs
```

### Problema: "Port 5432 already in use"

**Causa:** PostgreSQL local rodando na mesma porta.

**Solução:**
```cmd
# Pare o PostgreSQL local
# Ou use porta diferente nos testes
```

### Problema: "Out of Memory"

**Causa:** JVM sem memória suficiente.

**Solução:**
```cmd
set MAVEN_OPTS=-Xmx2g
.\mvnw.cmd test
```

### Problema: "Tests are ignored"

**Causa:** Classe de teste não termina com `Test` ou `IT`.

**Solução:**
- Testes unitários: `*Test.java`
- Testes integração: `*IT.java`

### Problema: "Dependency download failed"

**Causa:** Problema de rede ou proxy.

**Solução:**
```cmd
# Limpe o cache do Maven
.\mvnw.cmd dependency:purge-local-repository

# Configure proxy se necessário
# Edite: %USERPROFILE%\.m2\settings.xml
```

## 📊 Relatórios

### Cobertura de Código (JaCoCo)

```cmd
# Gerar relatório
.\mvnw.cmd clean test

# Abrir relatório
start target\site\jacoco\index.html
```

**Meta de cobertura:** 80% (build falha se abaixo)

### Relatório de Segurança (OWASP)

```cmd
# Executar scan
.\mvnw.cmd dependency-check:check

# Abrir relatório
start target\dependency-check-report.html
```

### Relatório de Testes de Carga (Gatling)

```cmd
# Executar teste
.\mvnw.cmd gatling:test

# Abrir relatório
start target\gatling\basicsimulation-*\index.html
```

## ✅ Checklist Antes de Commit

- [ ] Todos os testes passam: `.\mvnw.cmd verify`
- [ ] Cobertura acima de 80%: `.\mvnw.cmd jacoco:check`
- [ ] Sem vulnerabilidades críticas: `.\mvnw.cmd dependency-check:check`
- [ ] Código formatado corretamente
- [ ] Sem warnings de compilação

## 🔍 Comandos Úteis

```cmd
# Rodar teste específico
.\mvnw.cmd test -Dtest=MetricasAgendamentoServiceTest

# Rodar testes de um pacote
.\mvnw.cmd test -Dtest=com.belezza.api.service.*Test

# Pular testes
.\mvnw.cmd clean install -DskipTests

# Testes em modo debug
.\mvnw.cmd test -Dmaven.surefire.debug

# Limpar tudo
.\mvnw.cmd clean

# Ver dependências
.\mvnw.cmd dependency:tree

# Verificar atualizações
.\mvnw.cmd versions:display-dependency-updates
```

## 📈 Métricas de Qualidade

| Métrica | Objetivo | Atual |
|---------|----------|-------|
| Cobertura de Código | ≥ 80% | - |
| Testes Unitários | 100% passando | - |
| Testes Integração | 100% passando | - |
| Vulnerabilidades | 0 críticas | - |
| Build Time | < 5 min | - |

## 🆘 Suporte

Se encontrar problemas:

1. **Verifique os logs:** `target/surefire-reports/` ou `target/failsafe-reports/`
2. **Ative debug:** `.\mvnw.cmd test -X`
3. **Limpe e recompile:** `.\mvnw.cmd clean compile`
4. **Verifique versões:** `java -version` e `.\mvnw.cmd -version`

## 📚 Documentação Adicional

- [CODE_COVERAGE.md](CODE_COVERAGE.md) - Guia detalhado de cobertura
- [LOAD_TESTING.md](LOAD_TESTING.md) - Guia detalhado de testes de carga
- [SECURITY_TESTING.md](SECURITY_TESTING.md) - Guia detalhado de segurança

---

## 🎯 Quick Start

Para começar rapidamente:

```powershell
# 1. Compile o projeto
.\mvnw.cmd clean compile

# 2. Rode os testes unitários
.\mvnw.cmd test

# 3. Veja a cobertura
start target\site\jacoco\index.html

# 4. Se tudo passou, rode integração (requer Docker)
.\mvnw.cmd verify
```

**Pronto!** Agora você pode desenvolver com confiança. 🚀
