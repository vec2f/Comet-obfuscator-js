#Comet-obfuscator

CLI-обфускатор JavaScript для Node.js с дополнительным слоем упаковки.

Требования
- Node.js >= 18
- npm (или pnpm/yarn)

Установка и сборка
```bash

npm install


npm run build
```

Быстрый старт
```bash
# Обфусцировать файл
node bin/comet-obfuscator.js --input test.js --outDir dist

# Обфусцировать каталог с максимальными настройками + упаковщик
node bin/comet-obfuscator.js -i src -o dist -p hardened --pack

# Обфусцировать по шаблону с исключениями
node bin/comet-obfuscator.js -i "src/**/*.js" -o dist --exclude "src/**/__tests__/**" --exclude "**/*.spec.js"
```

Использование (CLI)
```bash
node bin/comet-obfuscator.js [options]
```

Параметры
- `--input, -i` строка: путь к файлу/директории/глобу. По умолчанию: текущая директория.
- `--outDir, -o` строка: выходная директория. По умолчанию: `dist`.
- `--preset, -p` строка: пресет обфускации. Допустимые: `default`, `hardened`. По умолчанию: `hardened`.
- `--config, -c` строка: путь к JSON с опциями `javascript-obfuscator` (сливается с пресетом).
- `--pack` флаг: добавить дополнительный упаковщик (XOR + eval) поверх обфускации.
- `--seed` число: сид для детерминированного результата.
- `--all` флаг: обрабатывать все файлы (не только `*.js, *.mjs, *.cjs`).
- `--exclude` массив: дополнительные глоб-исключения (можно повторять).
- `--controlFlow` boolean: форсировать `controlFlowFlattening` (переопределяет пресет).
- `--renameGlobals` boolean: форсировать `renameGlobals` (переопределяет пресет).
- `--silent` флаг: отключить весь вывод (никаких подсказок).
- `--help` показать помощь.
- `--version` показать версию.

Примеры
```bash
# Базовая обфускация каталога
node bin/comet-obfuscator.js -i src -o dist

# Жесткий пресет + упаковщик + детерминизм
node bin/comet-obfuscator.js -i src -o dist -p hardened --pack --seed 1234

# Один файл и кастомная конфигурация
node bin/comet-obfuscator.js -i index.js -o dist -c obfuscator.config.json

# Обработка всех типов файлов (например, .cjs, .mjs и прочие)
node bin/comet-obfuscator.js -i src -o dist --all

# Исключить тесты и конфиги
node bin/comet-obfuscator.js -i "src/**/*" -o dist --exclude "**/*.test.js" --exclude "**/*.spec.js" --exclude "**/config/**"

# Тихий режим (никаких подсказок)
node bin/comet-obfuscator.js -i src -o dist --silent
```

Пресеты
- `default`: умеренная обфускация, фокус на совместимость.
- `hardened`: усиленная обфускация (control-flow flattening, dead code, string array/encoding, и т.п.). Также устанавливается `target: "node"` для лучшей совместимости с Node.js.

Замечания:
- При `--pack` автоматически отключаются `selfDefending` и `debugProtection`, а `debugProtectionInterval` устанавливается в `0` для корректной работы рантайм-упаковщика (eval).
- По умолчанию в пресете `hardened` используется `disableConsoleOutput: false`, чтобы не ломать логи.

Конфигурация (JSON)
Можно передать файл конфигурации (обычно `obfuscator.config.json`) — все поля соответствуют опциям библиотеки `javascript-obfuscator` и сливаются поверх выбранного пресета.

Пример:
```json
{
  "domainLock": ["example.com"],
  "stringArrayEncoding": ["rc4"],
  "stringArrayWrappersCount": 2,
  "compact": true,
  "unicodeEscapeSequence": false
}
```

Запуск с конфигом:
```bash
node bin/comet-obfuscator.js -i src -o dist -c obfuscator.config.json
```

Приоритет опций:
1) Пресет (`default`/`hardened`)
2) Конфиг (`--config`)
3) Переопределения флагами CLI (`--controlFlow`, `--renameGlobals`, `--seed`)

Дополнительный упаковщик (`--pack`)
- Шифрует обфусцированный код XOR-ключом и добавляет мини-рантайм на `eval`.
- Усложняет статический анализ, может увеличивать размер и снижать производительность.
- Совместим с Node.js; при включении упаковки мы автоматически блокируем опции, несовместимые с eval-оберткой.

Рекомендации
- Для сборок в CI используйте `--seed`, чтобы стабилизировать результат.
- Для бэкенда чаще достаточно `hardened` без `--pack`. Упаковщик имеет смысл, если нужен дополнительный слой защиты.
- Избегайте `disableConsoleOutput: true` если приложение логирует в консоль.
- Не храните секреты в коде — обфускация не заменяет полноценную защиту/секрет-менеджмент.

Примеры скриптов npm
```json
{
  "scripts": {
    "build:obf": "node bin/comet-obfuscator.js -i src -o dist -p hardened",
    "build:obf:pack": "node bin/comet-obfuscator.js -i src -o dist -p hardened --pack",
    "start:dist": "node dist/index.js"
  }
}
```

Пример CI (GitHub Actions)
```yaml
name: build-obfuscated
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: node bin/comet-obfuscator.js -i src -o dist -p hardened --seed 1234
      - run: node dist/index.js
```

Устранение проблем
- Скрипт не запускается после обфускации:
  - Если включен `--pack`, он уже автоматически отключает конфликтующие опции. Убедитесь, что не добавляете их обратно в `--config`.
  - Убедитесь, что целевые файлы — это Node.js скрипты (мы используем `target: "node"`).
- Ошибка в `debugProtectionInterval`:
  - Значение должно быть числом (например, `2000`) либо `0` при упаковке.
- Файл конфига не читается:
  - Проверьте валидность JSON и путь в `--config`.
- На Windows:
  - Рекомендуется запускать через `node bin/comet-obfuscator.js ...`.

