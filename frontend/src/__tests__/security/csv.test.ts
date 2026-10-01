import { celulaCsv, gerarCsv } from "@/utils/csv";

describe("CSV sem injeção de fórmula", () => {
  it.each([
    ['=HYPERLINK("http://x";"Clique")', `"'=HYPERLINK(""http://x"";""Clique"")"`],
    ["+1+1", `"'+1+1"`],
    ["-2+3", `"'-2+3"`],
    ["@SUM(A1)", `"'@SUM(A1)"`],
    ["\t=1", `"'\t=1"`],
    ["  =1+1", `"'  =1+1"`],
    ["＝1+1", `"'＝1+1"`],
    ["=cmd|' /C calc'!A0", `"'=cmd|' /C calc'!A0"`],
  ])("neutraliza %j", (entrada, esperado) => {
    expect(celulaCsv(entrada)).toBe(esperado);
  });

  it("mantém texto comum e números, inclusive negativos", () => {
    expect(celulaCsv("Maria Silva")).toBe('"Maria Silva"');
    expect(celulaCsv("-10.50")).toBe('"-10.50"');
    expect(celulaCsv("-")).toBe('"-"');
    expect(celulaCsv(-10.5)).toBe("-10.5");
    expect(celulaCsv(42)).toBe("42");
    expect(celulaCsv(null)).toBe('""');
    expect(celulaCsv(undefined)).toBe('""');
  });

  it("separador e quebra de linha no texto não desalinham as colunas", () => {
    expect(gerarCsv([["Corte; escova", "linha1\nlinha2"], [1, 2]])).toBe('"Corte; escova";"linha1\nlinha2"\r\n1;2');
  });
});
