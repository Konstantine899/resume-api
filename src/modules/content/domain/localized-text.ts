export interface LocalizedTextProps {
  en: string;
  ru: string;
}

export class LocalizedText {
  readonly en: string;
  readonly ru: string;

  private constructor(props: LocalizedTextProps) {
    this.en = props.en;
    this.ru = props.ru;
  }

  static of(props: LocalizedTextProps): LocalizedText {
    LocalizedText.assert(props);
    return new LocalizedText({ en: props.en, ru: props.ru });
  }

  static assert(props: LocalizedTextProps): void {
    if (typeof props?.en !== 'string' || props.en.trim().length === 0) {
      throw new Error('LocalizedText: en must be non-empty');
    }
    if (typeof props?.ru !== 'string' || props.ru.trim().length === 0) {
      throw new Error('LocalizedText: ru must be non-empty');
    }
  }

  toJSON(): LocalizedTextProps {
    return { en: this.en, ru: this.ru };
  }

  static fromJSON(value: unknown): LocalizedText {
    if (!value || typeof value !== 'object') {
      throw new Error('LocalizedText: invalid json');
    }
    const obj = value as Record<string, unknown>;
    return LocalizedText.of({ en: String(obj.en ?? ''), ru: String(obj.ru ?? '') });
  }

  equals(other: LocalizedText): boolean {
    return this.en === other.en && this.ru === other.ru;
  }
}
