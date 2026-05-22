export type ArticleBlockKind = "heading" | "paragraph" | "list-item" | "quote";
export type ArticleLineKind =
  | ArticleBlockKind
  | "list-continuation"
  | "spacer"
  | "separator";
export type RadialTextAlign = "left" | "right" | "justify";

export interface ArticleBlock {
  kind: ArticleBlockKind;
  text: string;
  level?: number;
}

export interface ArticleLine {
  kind: ArticleLineKind;
  text: string;
  fontSize: number;
  weight: number;
  family: string;
  italic: boolean;
}

export interface TextStyle {
  fontSize: number;
  weight: number;
  family: string;
  italic?: boolean;
}

export interface BuildArticleLinesOptions {
  maxWidth: number;
  wrapText: (text: string, maxWidth: number, style: TextStyle) => string[];
  typography?: ArticleTypography;
}

export type ArticleTypography = Partial<Record<ArticleLineKind, Partial<TextStyle>>>;
