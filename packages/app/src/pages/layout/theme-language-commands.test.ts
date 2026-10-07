import { describe, expect, mock, test } from "bun:test"
import type { useLanguage } from "@/context/language"
import type { useTheme } from "@opencode-ai/ui/theme/context"

mock.module("@/utils/toast", () => ({ showToast: () => {} }))

import { useThemeLanguageCommands } from "./theme-language-commands"

type Theme = ReturnType<typeof useTheme>
type Language = ReturnType<typeof useLanguage>

const createTheme = (input?: { ids?: string[] }) => {
  const ids = input?.ids ?? ["oc-1", "dracula"]
  const calls = {
    setTheme: [] as string[],
    setColorScheme: [] as string[],
    previewTheme: [] as string[],
    previewColorScheme: [] as string[],
    commitPreview: 0,
    cancelPreview: 0,
  }
  const theme = {
    ids: () => ids,
    themes: () => Object.fromEntries(ids.map((id) => [id, { name: id }])),
    themeId: () => ids[0],
    setTheme: (id: string) => calls.setTheme.push(id),
    name: (id: string) => `Name ${id}`,
    colorScheme: () => "system" as const,
    setColorScheme: (scheme: string) => calls.setColorScheme.push(scheme),
    commitPreview: () => calls.commitPreview++,
    previewTheme: (id: string) => calls.previewTheme.push(id),
    cancelPreview: () => calls.cancelPreview++,
    previewColorScheme: (scheme: string) => calls.previewColorScheme.push(scheme),
  } as unknown as Theme
  return { theme, calls }
}

const createLanguage = () => {
  const calls = { setLocale: [] as string[] }
  const language = {
    t: (key: string) => key,
    locale: () => "en" as const,
    locales: ["en", "pt"] as const,
    setLocale: (locale: string) => calls.setLocale.push(locale),
    label: (locale: string) => locale,
  } as unknown as Language
  return { language, calls }
}

describe("useThemeLanguageCommands", () => {
  test("registers theme, scheme, and language commands", () => {
    const { theme } = createTheme()
    const { language } = createLanguage()
    const commands = useThemeLanguageCommands({ theme, language })

    const ids = commands().map((command) => command.id)
    expect(ids).toContain("theme.cycle")
    expect(ids).toContain("theme.set.oc-1")
    expect(ids).toContain("theme.set.dracula")
    expect(ids).toContain("theme.scheme.cycle")
    expect(ids).toContain("theme.scheme.system")
    expect(ids).toContain("theme.scheme.light")
    expect(ids).toContain("theme.scheme.dark")
    expect(ids).toContain("language.cycle")
    expect(ids).toContain("language.set.en")
    expect(ids).toContain("language.set.pt")
  })

  test("binds keybinds only when requested", () => {
    const { theme } = createTheme()
    const { language } = createLanguage()

    const bound = useThemeLanguageCommands({ theme, language, keybinds: true })()
    expect(bound.find((command) => command.id === "theme.cycle")?.keybind).toBe("mod+shift+t")
    expect(bound.find((command) => command.id === "theme.scheme.cycle")?.keybind).toBe("mod+shift+s")

    const unbound = useThemeLanguageCommands({ theme, language })()
    expect(unbound.find((command) => command.id === "theme.cycle")?.keybind).toBeUndefined()
    expect(unbound.find((command) => command.id === "theme.scheme.cycle")?.keybind).toBeUndefined()
  })

  test("theme.set commits the preview and previews on highlight", () => {
    const { theme, calls } = createTheme()
    const { language } = createLanguage()
    const commands = useThemeLanguageCommands({ theme, language })

    const set = commands().find((command) => command.id === "theme.set.dracula")
    expect(set).toBeDefined()

    const cancel = set!.onHighlight?.()
    expect(calls.previewTheme).toEqual(["dracula"])
    cancel?.()
    expect(calls.cancelPreview).toBe(1)

    set!.onSelect?.("palette")
    expect(calls.commitPreview).toBe(1)
  })

  test("scheme.set previews the color scheme on highlight", () => {
    const { theme, calls } = createTheme()
    const { language } = createLanguage()
    const commands = useThemeLanguageCommands({ theme, language })

    const set = commands().find((command) => command.id === "theme.scheme.dark")
    const cancel = set!.onHighlight?.()
    expect(calls.previewColorScheme).toEqual(["dark"])
    cancel?.()
    expect(calls.cancelPreview).toBe(1)
  })
})
