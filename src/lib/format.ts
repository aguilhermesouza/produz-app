export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function nInt(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n)
}
