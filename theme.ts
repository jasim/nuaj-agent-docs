/**
 * The Starlight settings that go with theme.css: the Inter font in `head` and
 * Expressive Code drawn flat, square and borderless so theme.css can rule it.
 */
export const themeHead = [
  { tag: "link", attrs: { rel: "preconnect", href: "https://fonts.googleapis.com" } },
  { tag: "link", attrs: { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "anonymous" } },
  {
    tag: "link",
    attrs: {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&display=swap",
    },
  },
] as const;

export const themeExpressiveCode = {
  themes: ["github-dark-default", "github-light-default"],
  useStarlightUiThemeColors: false,
  styleOverrides: {
    borderRadius: "0px",
    borderWidth: "0px",
    codePaddingBlock: "0.75rem",
    codePaddingInline: "1rem",
    codeFontSize: "0.875rem",
    codeLineHeight: "1.5",
  },
};
