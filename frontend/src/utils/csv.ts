/**
 * CSV para abrir no Excel sem risco de injeção de fórmula (CSV injection). Um campo que começa
 * com =, +, -, @, tab ou quebra de linha é lido pelo Excel/LibreOffice como fórmula: um cliente
 * cadastrado com o nome =HYPERLINK("http://site-malicioso";"Clique") virava um link na planilha
 * de quem exporta, e fórmulas DDE podiam até executar programas. Esses campos ganham um apóstrofo
 * na frente, e viram texto.
 *
 * Todo campo vai entre aspas (aspas internas dobradas), então ";" e quebras de linha no texto não
 * desalinham as colunas. Números (tipo number) passam direto: não há como esconder fórmula neles.
 */

// Inclui as versões "largas" (＝ ＋ － ＠), que algumas planilhas também tratam como fórmula
const INICIO_DE_FORMULA = /^\s*[=+\-@\t\r\n＝＋－＠]/;
// Texto que é só um número (ex.: "-10.50", vindo de toFixed) continua número
const NUMERO = /^-?\d+([.,]\d+)?$/;

export function celulaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return '""';
  if (typeof valor === "number") return Number.isFinite(valor) ? String(valor) : '""';
  let texto = String(valor);
  // "-" sozinho (campo vazio nas planilhas) não é fórmula
  if (INICIO_DE_FORMULA.test(texto) && !NUMERO.test(texto) && texto.trim() !== "-") {
    texto = "'" + texto;
  }
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Monta o CSV (separador ";", o padrão do Excel em português). */
export function gerarCsv(linhas: unknown[][], separador = ";"): string {
  return linhas.map((linha) => linha.map(celulaCsv).join(separador)).join("\r\n");
}

/** Gera e baixa o arquivo, com BOM para o Excel reconhecer os acentos (UTF-8). */
export function baixarCsv(nomeArquivo: string, linhas: unknown[][]): void {
  const blob = new Blob(["﻿" + gerarCsv(linhas)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
