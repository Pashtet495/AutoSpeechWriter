"use strict";
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
const fs = require("fs");
const readline = require("readline");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const readline__namespace = /* @__PURE__ */ _interopNamespaceDefault(readline);
const LOCALES = [
  { code: "en", name: "English" },
  { code: "ru", name: "Русский" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "zh", name: "简体中文" }
];
const SUPPORTED = LOCALES.map((l) => l.code);
function detectLocale(raw) {
  if (!raw) return "en";
  const sub = raw.toLowerCase().split("-")[0];
  if (sub === "zh") return "zh";
  return SUPPORTED.includes(sub) ? sub : "en";
}
function t(locale, key, params) {
  const dict = translations[locale] || translations.en;
  let s = dict[key] ?? translations.en[key] ?? key;
  return s;
}
const translations = {
  en: {
    "app.name": "AutoSpeechWriter",
    "header.title": "AutoSpeechWriter",
    "status.ready": "Ready",
    "transcript.placeholder": "Recognized text will appear here...",
    "transcript.silence": "Silence detected",
    "btn.selectFile": "Select File",
    "btn.record": "Record",
    "btn.stop": "Stop & Insert",
    "btn.clear": "Clear transcript",
    "btn.copy": "Copy all text",
    "btn.autoPaste": "Auto-paste",
    "btn.logs": "Toggle logs",
    "btn.settings": "Settings",
    "autopaste.on.tip": "Auto-paste ON: each phrase is pasted into the active app at the cursor",
    "autopaste.off.tip": "Auto-paste OFF: only copy to clipboard on stop",
    "toast.copied": "Copied to clipboard",
    "toast.inserted": "Dictation finished — text inserted",
    "logs.title": "System Console",
    "settings.title": "Settings",
    "settings.backend": "Backend",
    "settings.inputDevice": "Input Device",
    "settings.cpuThreads": "CPU Threads",
    "settings.gpuId": "GPU ID",
    "settings.language": "Interface Language",
    "settings.recognitionLanguage": "Recognition Language",
    "settings.hotkey": "Record Hotkey",
    "settings.hotkeyHint": "Click the field, then press the desired key combination. Esc cancels, Backspace clears.",
    "settings.performanceMode": "Performance Mode",
    "settings.modeLowest": "Lowest Latency",
    "settings.modeBest": "Best Correction / Quality",
    "settings.autoStart": "Run application at system startup",
    "settings.autoPasteHotkey": "Auto-paste when starting recognition via hotkey",
    "settings.cancel": "Cancel",
    "settings.apply": "Apply",
    "mic.default": "System Default",
    "mic.index": "Microphone (Index {n})",
    "help.autopaste.title": "Auto-paste",
    "help.autopaste.body": "The recognized text is automatically pasted via the clipboard to the location of the cursor. How to use: 1) Place the cursor in the application where you want to enter text. 2) Activate recognition by pressing the hotkey. 3) The recognized text will be pasted at the cursor position. 4) Wait for recognition to finish. 5) Press the hotkey again to stop recognition.",
    "help.performance.title": "Performance Mode",
    "help.performance.body": "Automatic post-recognition correction setting. The Lowest Latency mode outputs text almost immediately, interfering minimally with dictation. The Best Recognition and Correction mode can automatically remove filler words, hesitations, and partial word repetitions, and strives to preserve consistent punctuation even if there were pauses in the middle of sentences during dictation. It handles mixed-language dictation better. Note: in conditions of background voice noise, using the application in Lowest Latency mode is recommended.",
    "license.title": "License & Components",
    "license.app": "AutoSpeechWriter — Copyright © Конюшков Павел. Licensed under the MIT License.",
    "license.backend": "Speech recognition backend:",
    "license.backendLicense": "MIT License — Copyright (c) 2023-2026 The ggml authors",
    "license.model": "Model:",
    "license.modelTerms": "GOVERNING TERMS: Use of this model is governed by the CC-BY-4.0 license.",
    "license.quantModel": "Quantized model:",
    "tray.open": "Open AutoSpeechWriter",
    "tray.modeLowest": "Performance Mode: Lowest Latency",
    "tray.modeBest": "Performance Mode: Best Quality",
    "tray.autoPaste": "Auto-paste (paste recognized text into the active application as it is recognized)",
    "tray.autoStart": "Run at startup",
    "tray.exit": "Exit"
  },
  ru: {
    "app.name": "AutoSpeechWriter",
    "header.title": "AutoSpeechWriter",
    "status.ready": "Готов",
    "transcript.placeholder": "Здесь появится распознанный текст...",
    "transcript.silence": "Обнаружена тишина",
    "btn.selectFile": "Выбрать файл",
    "btn.record": "Запись",
    "btn.stop": "Стоп и вставка",
    "btn.clear": "Очистить текст",
    "btn.copy": "Копировать весь текст",
    "btn.autoPaste": "Автовставка",
    "btn.logs": "Показать логи",
    "btn.settings": "Настройки",
    "autopaste.on.tip": "Автовставка ВКЛ: каждая фраза вставляется в активное приложение в позиции курсора",
    "autopaste.off.tip": "Автовставка ВЫКЛ: только копирование в буфер при остановке",
    "toast.copied": "Текст скопирован в буфер обмена",
    "toast.inserted": "Диктовка завершена — текст вставлен",
    "logs.title": "Системная консоль",
    "settings.title": "Настройки",
    "settings.backend": "Бэкенд",
    "settings.inputDevice": "Устройство ввода",
    "settings.cpuThreads": "Потоки CPU",
    "settings.gpuId": "ID GPU",
    "settings.language": "Язык интерфейса",
    "settings.recognitionLanguage": "Язык распознавания",
    "settings.hotkey": "Горячая клавиша записи",
    "settings.hotkeyHint": "Нажмите на поле, затем нажмите нужную комбинацию клавиш. Esc — отмена, Backspace — очистить.",
    "settings.performanceMode": "Режим производительности",
    "settings.modeLowest": "Минимальная задержка",
    "settings.modeBest": "Лучшее распознавание / коррекция",
    "settings.autoStart": "Запускать приложение при старте системы",
    "settings.autoPasteHotkey": "Автовставка при запуске распознавания горячей клавишей",
    "settings.cancel": "Отмена",
    "settings.apply": "Применить",
    "mic.default": "Системное умолчание",
    "mic.index": "Микрофон (Индекс {n})",
    "help.autopaste.title": "Автовставка",
    "help.autopaste.body": "Сформированный распознанный текст через буфер обмена автоматически вставляется в место, куда установлен курсор. Инструкция по использованию: 1) установите курсор в приложении в котором нужно ввести текст. 2) Активируйте распознавание звука нажатием горячей клавиши. 3) Распознанный текст будет вставляться в место установки курсора. 4) Дождитесь окончание распознавания. 5) Повторно нажмите горячую клавишу для завершения распознавания.",
    "help.performance.title": "Режим производительности",
    "help.performance.body": "Настройка автоматической коррекции после распознавания. Режим минимальной задержки выводит текст почти сразу, минимально вмешиваясь в диктовку. Режим лучшего распознавания и коррекции позволяет автоматически удалять слова паразиты, запинки, частичные повторы слов, стремиться сохранить целостную пунктуацию, даже если при диктовке были паузы в середине предложений. Лучше справляется с диктовкой смешанных языков. Примечание: в условиях фонового голосового шума работа приложения рекомендуется в режиме минимальной задержки.",
    "license.title": "Лицензия и компоненты",
    "license.app": "AutoSpeechWriter — Copyright © Конюшков Павел. Используется по лицензии MIT.",
    "license.backend": "Бэкенд распознавания речи:",
    "license.backendLicense": "MIT License — Copyright (c) 2023-2026 The ggml authors",
    "license.model": "Модель:",
    "license.modelTerms": "УСЛОВИЯ ИСПОЛЬЗОВАНИЯ: Использование данной модели регулируется лицензией CC-BY-4.0.",
    "license.quantModel": "Квантованная модель:",
    "tray.open": "Открыть AutoSpeechWriter",
    "tray.modeLowest": "Режим: Минимальная задержка",
    "tray.modeBest": "Режим: Лучшее качество",
    "tray.autoPaste": "Автовставка (вставлять распознанный текст в активное приложение по мере распознавания)",
    "tray.autoStart": "Запускать при старте",
    "tray.exit": "Выход"
  },
  // Filled in by translation pass — fall back to English until then.
  de: {
    "app.name": "AutoSpeechWriter",
    "header.title": "AutoSpeechWriter",
    "status.ready": "Bereit",
    "transcript.placeholder": "Hier erscheint der erkannte Text...",
    "transcript.silence": "Stille erkannt",
    "btn.selectFile": "Datei auswählen",
    "btn.record": "Aufnahme",
    "btn.stop": "Stopp & Einfügen",
    "btn.clear": "Text löschen",
    "btn.copy": "Gesamten Text kopieren",
    "btn.autoPaste": "Auto-Einfügen",
    "btn.logs": "Protokolle ein-/ausblenden",
    "btn.settings": "Einstellungen",
    "autopaste.on.tip": "Auto-Einfügen AN: Jeder Satz wird im aktiven Programm an der Cursorposition eingefügt",
    "autopaste.off.tip": "Auto-Einfügen AUS: Beim Stopp nur in die Zwischenablage kopieren",
    "toast.copied": "In die Zwischenablage kopiert",
    "toast.inserted": "Diktat beendet — Text eingefügt",
    "logs.title": "Systemkonsole",
    "settings.title": "Einstellungen",
    "settings.backend": "Backend",
    "settings.inputDevice": "Eingabegerät",
    "settings.cpuThreads": "CPU-Threads",
    "settings.gpuId": "GPU-ID",
    "settings.language": "Oberflächensprache",
    "settings.hotkey": "Aufnahme-Hotkey",
    "settings.hotkeyHint": "Klicken Sie auf das Feld und drücken Sie dann die gewünschte Tastenkombination. Esc bricht ab, Backspace löscht.",
    "settings.performanceMode": "Leistungsmodus",
    "settings.modeLowest": "Niedrigste Latenz",
    "settings.modeBest": "Beste Korrektur / Qualität",
    "settings.autoStart": "Anwendung beim Systemstart ausführen",
    "settings.autoPasteHotkey": "Auto-Einfügen beim Starten der Erkennung über Hotkey",
    "settings.cancel": "Abbrechen",
    "settings.apply": "Anwenden",
    "mic.default": "Systemstandard",
    "mic.index": "Mikrofon (Index {n})",
    "help.autopaste.title": "Auto-Einfügen",
    "help.autopaste.body": "Der erkannte Text wird automatisch über die Zwischenablage an der Cursorposition eingefügt. Verwendung: 1) Platzieren Sie den Cursor in der Anwendung, in der Sie Text eingeben möchten. 2) Aktivieren Sie die Erkennung durch Drücken des Hotkeys. 3) Der erkannte Text wird an der Cursorposition eingefügt. 4) Warten Sie, bis die Erkennung abgeschlossen ist. 5) Drücken Sie den Hotkey erneut, um die Erkennung zu stoppen.",
    "help.performance.title": "Leistungsmodus",
    "help.performance.body": "Einstellung der automatischen Korrektur nach der Erkennung. Der Modus „Niedrigste Latenz“ gibt den Text nahezu sofort aus und greift minimal in das Diktat ein. Der Modus „Beste Erkennung und Korrektur“ kann Füllwörter, Zögern und teilweise Wortwiederholungen automatisch entfernen und ist bestrebt, eine konsistente Zeichensetzung beizubehalten, selbst wenn während des Diktats Pausen mitten in Sätzen auftraten. Er geht besser mit gemischtsprachigem Diktat um. Hinweis: Bei Hintergrundgeräuschen durch Stimmen wird die Verwendung der Anwendung im Modus „Niedrigste Latenz“ empfohlen.",
    "license.title": "Lizenz & Komponenten",
    "license.app": "AutoSpeechWriter — Copyright © Конюшков Павел. Lizenziert unter der MIT License.",
    "license.backend": "Spracherkennungs-Backend:",
    "license.backendLicense": "MIT License — Copyright (c) 2023-2026 The ggml authors",
    "license.model": "Modell:",
    "license.modelTerms": "GELTENDE BEDINGUNGEN: Die Nutzung dieses Modells unterliegt der CC-BY-4.0-Lizenz.",
    "license.quantModel": "Quantisiertes Modell:",
    "tray.open": "AutoSpeechWriter öffnen",
    "tray.modeLowest": "Leistungsmodus: Niedrigste Latenz",
    "tray.modeBest": "Leistungsmodus: Beste Qualität",
    "tray.autoPaste": "Auto-Einfügen (erkannten Text während der Erkennung in die aktive Anwendung einfügen)",
    "tray.autoStart": "Beim Start ausführen",
    "tray.exit": "Beenden"
  },
  fr: {
    "app.name": "AutoSpeechWriter",
    "header.title": "AutoSpeechWriter",
    "status.ready": "Prêt",
    "transcript.placeholder": "Le texte reconnu apparaîtra ici...",
    "transcript.silence": "Silence détecté",
    "btn.selectFile": "Sélectionner un fichier",
    "btn.record": "Enregistrer",
    "btn.stop": "Arrêter et insérer",
    "btn.clear": "Effacer la transcription",
    "btn.copy": "Copier tout le texte",
    "btn.autoPaste": "Auto-collage",
    "btn.logs": "Afficher/masquer les journaux",
    "btn.settings": "Paramètres",
    "autopaste.on.tip": "Auto-collage ACTIVÉ : chaque phrase est collée dans l'application active à l'emplacement du curseur",
    "autopaste.off.tip": "Auto-collage DÉSACTIVÉ : uniquement copier dans le presse-papiers à l'arrêt",
    "toast.copied": "Copié dans le presse-papiers",
    "toast.inserted": "Dictée terminée — texte inséré",
    "logs.title": "Console système",
    "settings.title": "Paramètres",
    "settings.backend": "Backend",
    "settings.inputDevice": "Périphérique d'entrée",
    "settings.cpuThreads": "Threads CPU",
    "settings.gpuId": "ID GPU",
    "settings.language": "Langue de l'interface",
    "settings.hotkey": "Raccourci d'enregistrement",
    "settings.hotkeyHint": "Cliquez sur le champ, puis appuyez sur la combinaison de touches souhaitée. Esc annule, Backspace efface.",
    "settings.performanceMode": "Mode de performance",
    "settings.modeLowest": "Latence la plus basse",
    "settings.modeBest": "Meilleure correction / qualité",
    "settings.autoStart": "Lancer l'application au démarrage du système",
    "settings.autoPasteHotkey": "Auto-collage lors du démarrage de la reconnaissance via raccourci",
    "settings.cancel": "Annuler",
    "settings.apply": "Appliquer",
    "mic.default": "Valeur système par défaut",
    "mic.index": "Microphone (Index {n})",
    "help.autopaste.title": "Auto-collage",
    "help.autopaste.body": "Le texte reconnu est automatiquement collé via le presse-papiers à l'emplacement du curseur. Mode d'emploi : 1) Placez le curseur dans l'application où vous souhaitez saisir du texte. 2) Activez la reconnaissance en appuyant sur le raccourci. 3) Le texte reconnu sera collé à la position du curseur. 4) Attendez la fin de la reconnaissance. 5) Appuyez à nouveau sur le raccourci pour arrêter la reconnaissance.",
    "help.performance.title": "Mode de performance",
    "help.performance.body": "Paramètre de correction automatique après reconnaissance. Le mode Latence la plus basse produit le texte presque immédiatement, en interférant minimement avec la dictée. Le mode Meilleure reconnaissance et correction peut supprimer automatiquement les mots de remplissage, les hésitations et les répétitions partielles de mots, et s'efforce de préserver une ponctuation cohérente même s'il y a eu des pauses au milieu des phrases pendant la dictée. Il gère mieux la dictée en langues mixtes. Remarque : en présence de bruit vocal ambiant, l'utilisation de l'application en mode Latence la plus basse est recommandée.",
    "license.title": "Licence et composants",
    "license.app": "AutoSpeechWriter — Copyright © Конюшков Павел. Sous licence MIT License.",
    "license.backend": "Backend de reconnaissance vocale :",
    "license.backendLicense": "MIT License — Copyright (c) 2023-2026 The ggml authors",
    "license.model": "Modèle :",
    "license.modelTerms": "CONDITIONS APPLICABLES : L'utilisation de ce modèle est régie par la licence CC-BY-4.0.",
    "license.quantModel": "Modèle quantifié :",
    "tray.open": "Ouvrir AutoSpeechWriter",
    "tray.modeLowest": "Mode de performance : Latence la plus basse",
    "tray.modeBest": "Mode de performance : Meilleure qualité",
    "tray.autoPaste": "Auto-collage (coller le texte reconnu dans l'application active au fur et à mesure de la reconnaissance)",
    "tray.autoStart": "Lancer au démarrage",
    "tray.exit": "Quitter"
  },
  es: {
    "app.name": "AutoSpeechWriter",
    "header.title": "AutoSpeechWriter",
    "status.ready": "Listo",
    "transcript.placeholder": "El texto reconocido aparecerá aquí...",
    "transcript.silence": "Silencio detectado",
    "btn.selectFile": "Seleccionar archivo",
    "btn.record": "Grabar",
    "btn.stop": "Detener e insertar",
    "btn.clear": "Borrar transcripción",
    "btn.copy": "Copiar todo el texto",
    "btn.autoPaste": "Auto-pegar",
    "btn.logs": "Mostrar/ocultar registros",
    "btn.settings": "Ajustes",
    "autopaste.on.tip": "Auto-pegar ACTIVADO: cada frase se pega en la aplicación activa en la posición del cursor",
    "autopaste.off.tip": "Auto-pegar DESACTIVADO: solo copiar al portapapeles al detener",
    "toast.copied": "Copiado al portapapeles",
    "toast.inserted": "Dictado finalizado — texto insertado",
    "logs.title": "Consola del sistema",
    "settings.title": "Ajustes",
    "settings.backend": "Backend",
    "settings.inputDevice": "Dispositivo de entrada",
    "settings.cpuThreads": "Hilos de CPU",
    "settings.gpuId": "ID de GPU",
    "settings.language": "Idioma de la interfaz",
    "settings.hotkey": "Atajo de grabación",
    "settings.hotkeyHint": "Haga clic en el campo y luego presione la combinación de teclas deseada. Esc cancela, Backspace borra.",
    "settings.performanceMode": "Modo de rendimiento",
    "settings.modeLowest": "Latencia más baja",
    "settings.modeBest": "Mejor corrección / calidad",
    "settings.autoStart": "Ejecutar la aplicación al inicio del sistema",
    "settings.autoPasteHotkey": "Auto-pegar al iniciar el reconocimiento mediante atajo",
    "settings.cancel": "Cancelar",
    "settings.apply": "Aplicar",
    "mic.default": "Predeterminado del sistema",
    "mic.index": "Micrófono (Index {n})",
    "help.autopaste.title": "Auto-pegar",
    "help.autopaste.body": "El texto reconocido se pega automáticamente a través del portapapeles en la posición del cursor. Cómo usarlo: 1) Coloque el cursor en la aplicación donde desea introducir texto. 2) Active el reconocimiento presionando el atajo. 3) El texto reconocido se pegará en la posición del cursor. 4) Espere a que termine el reconocimiento. 5) Presione el atajo de nuevo para detener el reconocimiento.",
    "help.performance.title": "Modo de rendimiento",
    "help.performance.body": "Configuración de corrección automática posterior al reconocimiento. El modo Latencia más baja produce el texto casi de inmediato, interfiriendo mínimamente con el dictado. El modo Mejor reconocimiento y corrección puede eliminar automáticamente muletillas, vacilaciones y repeticiones parciales de palabras, y se esfuerza por mantener una puntuación coherente incluso si hubo pausas en medio de las frases durante el dictado. Maneja mejor el dictado en idiomas mixtos. Nota: en condiciones de ruido de voz de fondo, se recomienda usar la aplicación en modo Latencia más baja.",
    "license.title": "Licencia y componentes",
    "license.app": "AutoSpeechWriter — Copyright © Конюшков Павел. Licenciado bajo la MIT License.",
    "license.backend": "Backend de reconocimiento de voz:",
    "license.backendLicense": "MIT License — Copyright (c) 2023-2026 The ggml authors",
    "license.model": "Modelo:",
    "license.modelTerms": "CONDICIONES APLICABLES: El uso de este modelo se rige por la licencia CC-BY-4.0.",
    "license.quantModel": "Modelo cuantificado:",
    "tray.open": "Abrir AutoSpeechWriter",
    "tray.modeLowest": "Modo de rendimiento: Latencia más baja",
    "tray.modeBest": "Modo de rendimiento: Mejor calidad",
    "tray.autoPaste": "Auto-pegar (pegar el texto reconocido en la aplicación activa a medida que se reconoce)",
    "tray.autoStart": "Ejecutar al inicio",
    "tray.exit": "Salir"
  },
  it: {
    "app.name": "AutoSpeechWriter",
    "header.title": "AutoSpeechWriter",
    "status.ready": "Pronto",
    "transcript.placeholder": "Il testo riconosciuto apparirà qui...",
    "transcript.silence": "Silenzio rilevato",
    "btn.selectFile": "Seleziona file",
    "btn.record": "Registra",
    "btn.stop": "Ferma e inserisci",
    "btn.clear": "Cancella trascrizione",
    "btn.copy": "Copia tutto il testo",
    "btn.autoPaste": "Auto-incolla",
    "btn.logs": "Mostra/nascondi registri",
    "btn.settings": "Impostazioni",
    "autopaste.on.tip": "Auto-incolla ATTIVO: ogni frase viene incollata nell'applicazione attiva in corrispondenza del cursore",
    "autopaste.off.tip": "Auto-incolla DISATTIVATO: copia solo negli appunti allo stop",
    "toast.copied": "Copiato negli appunti",
    "toast.inserted": "Dettatura completata — testo inserito",
    "logs.title": "Console di sistema",
    "settings.title": "Impostazioni",
    "settings.backend": "Backend",
    "settings.inputDevice": "Dispositivo di input",
    "settings.cpuThreads": "Thread CPU",
    "settings.gpuId": "ID GPU",
    "settings.language": "Lingua dell'interfaccia",
    "settings.hotkey": "Scorciatoia per la registrazione",
    "settings.hotkeyHint": "Fare clic sul campo, quindi premere la combinazione di tasti desiderata. Esc annulla, Backspace cancella.",
    "settings.performanceMode": "Modalità prestazioni",
    "settings.modeLowest": "Latenza più bassa",
    "settings.modeBest": "Miglior correzione / qualità",
    "settings.autoStart": "Esegui l'applicazione all'avvio del sistema",
    "settings.autoPasteHotkey": "Auto-incolla all'avvio del riconoscimento tramite scorciatoia",
    "settings.cancel": "Annulla",
    "settings.apply": "Applica",
    "mic.default": "Predefinito di sistema",
    "mic.index": "Microfono (Index {n})",
    "help.autopaste.title": "Auto-incolla",
    "help.autopaste.body": "Il testo riconosciuto viene incollato automaticamente tramite gli appunti nella posizione del cursore. Come usarlo: 1) Posizionare il cursore nell'applicazione in cui si desidera inserire il testo. 2) Attivare il riconoscimento premendo la scorciatoia. 3) Il testo riconosciuto verrà incollato nella posizione del cursore. 4) Attendere il termine del riconoscimento. 5) Premere di nuovo la scorciatoia per fermare il riconoscimento.",
    "help.performance.title": "Modalità prestazioni",
    "help.performance.body": "Impostazione di correzione automatica post-riconoscimento. La modalità Latenza più bassa produce il testo quasi immediatamente, interferendo minimamente con la dettatura. La modalità Miglior riconoscimento e correzione può rimuovere automaticamente parole di riempimento, esitazioni e ripetizioni parziali di parole, e cerca di mantenere una punteggiatura coerente anche se ci sono state pause nel mezzo delle frasi durante la dettatura. Gestisce meglio la dettatura in lingue miste. Nota: in condizioni di rumore vocale di fondo, si consiglia di utilizzare l'applicazione in modalità Latenza più bassa.",
    "license.title": "Licenza e componenti",
    "license.app": "AutoSpeechWriter — Copyright © Конюшков Павел. Rilasciato sotto la MIT License.",
    "license.backend": "Backend di riconoscimento vocale:",
    "license.backendLicense": "MIT License — Copyright (c) 2023-2026 The ggml authors",
    "license.model": "Modello:",
    "license.modelTerms": "TERMINI APPLICABILI: L'uso di questo modello è regolato dalla licenza CC-BY-4.0.",
    "license.quantModel": "Modello quantizzato:",
    "tray.open": "Apri AutoSpeechWriter",
    "tray.modeLowest": "Modalità prestazioni: Latenza più bassa",
    "tray.modeBest": "Modalità prestazioni: Qualità migliore",
    "tray.autoPaste": "Auto-incolla (incolla il testo riconosciuto nell'applicazione attiva man mano che viene riconosciuto)",
    "tray.autoStart": "Esegui all'avvio",
    "tray.exit": "Esci"
  },
  zh: {
    "app.name": "AutoSpeechWriter",
    "header.title": "AutoSpeechWriter",
    "status.ready": "就绪",
    "transcript.placeholder": "识别的文本将显示在此处...",
    "transcript.silence": "检测到静音",
    "btn.selectFile": "选择文件",
    "btn.record": "录音",
    "btn.stop": "停止并插入",
    "btn.clear": "清除转录文本",
    "btn.copy": "复制全部文本",
    "btn.autoPaste": "自动粘贴",
    "btn.logs": "显示/隐藏日志",
    "btn.settings": "设置",
    "autopaste.on.tip": "自动粘贴开启：每个短语将粘贴到当前应用的光标位置",
    "autopaste.off.tip": "自动粘贴关闭：停止时仅复制到剪贴板",
    "toast.copied": "已复制到剪贴板",
    "toast.inserted": "听写已完成 — 文本已插入",
    "logs.title": "系统控制台",
    "settings.title": "设置",
    "settings.backend": "后端",
    "settings.inputDevice": "输入设备",
    "settings.cpuThreads": "CPU 线程",
    "settings.gpuId": "GPU ID",
    "settings.language": "界面语言",
    "settings.hotkey": "录音热键",
    "settings.hotkeyHint": "点击该字段，然后按下所需的组合键。Esc 取消，Backspace 清除。",
    "settings.performanceMode": "性能模式",
    "settings.modeLowest": "最低延迟",
    "settings.modeBest": "最佳修正 / 质量",
    "settings.autoStart": "在系统启动时运行应用",
    "settings.autoPasteHotkey": "通过热键启动识别时自动粘贴",
    "settings.cancel": "取消",
    "settings.apply": "应用",
    "mic.default": "系统默认",
    "mic.index": "麦克风 (Index {n})",
    "help.autopaste.title": "自动粘贴",
    "help.autopaste.body": "识别的文本将通过剪贴板自动粘贴到光标所在位置。使用方法：1) 将光标置于要输入文本的应用程序中。2) 按下热键激活识别。3) 识别的文本将粘贴到光标位置。4) 等待识别完成。5) 再次按下热键以停止识别。",
    "help.performance.title": "性能模式",
    "help.performance.body": "识别后的自动修正设置。最低延迟模式几乎立即输出文本，对听写的干扰最小。最佳识别与修正模式可自动删除填充词、犹豫和部分词语重复，并努力保持一致的标点符号，即使听写过程中句子中间出现了停顿。它能更好地处理混合语言听写。注意：在背景人声噪声条件下，建议以最低延迟模式使用本应用。",
    "license.title": "许可证与组件",
    "license.app": "AutoSpeechWriter — Copyright © Конюшков Павел. 依据 MIT License 授权。",
    "license.backend": "语音识别后端：",
    "license.backendLicense": "MIT License — Copyright (c) 2023-2026 The ggml authors",
    "license.model": "模型：",
    "license.modelTerms": "适用条款：本模型的使用受 CC-BY-4.0 许可证的约束。",
    "license.quantModel": "量化模型：",
    "tray.open": "打开 AutoSpeechWriter",
    "tray.modeLowest": "性能模式：最低延迟",
    "tray.modeBest": "性能模式：最佳质量",
    "tray.autoPaste": "自动粘贴（在识别过程中将识别的文本粘贴到当前应用）",
    "tray.autoStart": "开机时运行",
    "tray.exit": "退出"
  }
};
let win = null;
let tray = null;
let crispAsrProcess = null;
let isRecording = false;
let interimTranscript = "";
const settingsPath = path.join(electron.app.getPath("userData"), "crisp_settings.json");
let settings = {
  backend: "cpu",
  micDevice: "default",
  threads: 4,
  gpuId: 0,
  language: "auto",
  hotkey: "CommandOrControl+Shift+R",
  mode: "lowest-latency",
  autoStart: false,
  autoPaste: false,
  locale: ""
  // interface language; detected from OS on first launch
};
function curLocale() {
  return settings.locale || "en";
}
const IDLE_ICON_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAASklEQVR4nO3SsQ0AMAgDQfZfOilYAEe2SPGWqDmQqwgZ5oiJGMQxbu6LpLF+4QvAS6yA9Q8AoAMA6AAAOgBgvQOrgAkqugwAgGQuS3PxKyxOok0AAAAASUVORK5CYII=";
const REC_ICON_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAT0lEQVR4nO3SwQkAMAhDUadx/6G6h6UbqETs4Qc8+5SYEZJMFCMHHPeojHT5u6gKkH7hC0AnUsD6BwDQAQB0AAAdALDegVVABjW6DACAyVyXDcb6Sb1OQAAAAABJRU5ErkJggg==";
const IDLE_ICON = electron.nativeImage.createFromDataURL(IDLE_ICON_B64);
const REC_ICON = electron.nativeImage.createFromDataURL(REC_ICON_B64);
function loadSettings() {
  if (fs.existsSync(settingsPath)) {
    try {
      const data = fs.readFileSync(settingsPath, "utf8");
      settings = { ...settings, ...JSON.parse(data) };
      electron.app.setLoginItemSettings({ openAtLogin: settings.autoStart });
    } catch (e) {
      console.error("Could not load settings", e);
    }
  }
  if (!settings.locale) {
    settings.locale = detectLocale(electron.app.getLocale());
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (_) {
    }
  }
}
function saveSettings() {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  electron.app.setLoginItemSettings({ openAtLogin: settings.autoStart });
  registerHotkeys();
  rebuildTrayMenu();
  emitSettingsUpdated();
}
function emitSettingsUpdated() {
  win == null ? void 0 : win.webContents.send("settings-updated", { ...settings });
}
function setAutoPaste(value) {
  settings.autoPaste = !!value;
  saveSettings();
}
function registerHotkeys() {
  electron.globalShortcut.unregisterAll();
  if (settings.hotkey) {
    electron.globalShortcut.register(settings.hotkey, () => {
      if (isRecording) {
        stopMicrophone();
      } else {
        startMicrophone();
      }
    });
  }
}
function rebuildTrayMenu() {
  if (!tray) return;
  const L = curLocale();
  const ctxMenu = electron.Menu.buildFromTemplate([
    { label: t(L, "tray.open"), click: () => win == null ? void 0 : win.show() },
    {
      label: t(L, "tray.modeLowest"),
      type: "radio",
      checked: settings.mode === "lowest-latency",
      click: () => {
        settings.mode = "lowest-latency";
        saveSettings();
      }
    },
    {
      label: t(L, "tray.modeBest"),
      type: "radio",
      checked: settings.mode === "best-quality",
      click: () => {
        settings.mode = "best-quality";
        saveSettings();
      }
    },
    { type: "separator" },
    {
      label: t(L, "tray.autoPaste"),
      type: "checkbox",
      checked: settings.autoPaste,
      click: (item) => {
        setAutoPaste(item.checked);
      }
    },
    {
      label: t(L, "tray.autoStart"),
      type: "checkbox",
      checked: settings.autoStart,
      click: (item) => {
        settings.autoStart = item.checked;
        saveSettings();
      }
    },
    { label: t(L, "tray.exit"), click: () => {
      win == null ? void 0 : win.destroy();
      electron.app.quit();
    } }
  ]);
  tray.setContextMenu(ctxMenu);
}
function createTray() {
  tray = new electron.Tray(IDLE_ICON);
  tray.setToolTip("AutoSpeechWriter");
  rebuildTrayMenu();
  tray.on("click", () => {
    (win == null ? void 0 : win.isVisible()) ? win.hide() : win == null ? void 0 : win.show();
  });
}
function createWindow() {
  win = new electron.BrowserWindow({
    width: 600,
    height: 700,
    frame: false,
    resizable: true,
    title: "AutoSpeechWriter",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    // app/taskbar icon (microphone)
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: false
      // Keep running smartly when minimized
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  win.on("close", (e) => {
    e.preventDefault();
    win == null ? void 0 : win.hide();
  });
}
const INFO_PREFIXES = [
  "crispasr",
  "sensevoice",
  "parakeet",
  "whisper",
  "moonshine",
  "voxtral",
  "qwen",
  "canary",
  "auto-detected",
  "loading",
  "usage",
  "system memory",
  "ggml",
  "backend",
  "buffer",
  "model",
  "encoder",
  "decoder",
  "vulkan",
  "cuda",
  "whisper_init",
  "whisper_model_load",
  "whisper_backend",
  "whisper_print_timings",
  "[",
  "$",
  "=",
  "-",
  "POST",
  "Ping",
  "HTTP",
  "✓",
  "✗",
  "готов",
  "работает",
  "запуск",
  "сервер",
  "loaded",
  "processing",
  "transcribed",
  "main:"
];
function isResultLine(text) {
  if (!text) return false;
  const low = text.toLowerCase();
  for (const p of INFO_PREFIXES) {
    if (low.startsWith(p)) {
      return false;
    }
  }
  return true;
}
let micLastUtteranceId = -1;
function processAsrLogLine(line, mode) {
  if (!win) return;
  const trimmed = line.trim();
  if (trimmed.length === 0) return;
  if (mode === "mic") {
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === "silence") {
          win.webContents.send("silence-state", true);
          setTimeout(() => win == null ? void 0 : win.webContents.send("silence-state", false), 1500);
          return;
        }
        if (parsed.type && parsed.text !== void 0) {
          const utteranceId = parsed.utterance_id || 0;
          const text = parsed.text.trim();
          if (parsed.type === "partial") {
            win.webContents.send("transcription-update", text, false);
            return;
          } else if (parsed.type === "final") {
            if (utteranceId > micLastUtteranceId) {
              if (text) {
                micLastUtteranceId = utteranceId;
                interimTranscript += text + " ";
                win.webContents.send("transcription-update", text, true);
                win.webContents.send("log-update", `[ФИНАЛ] ${text}
`);
                if (settings.autoPaste || uiAutoPaste) {
                  executePasteIntoActiveApp(text + " ");
                }
              } else {
                win.webContents.send("transcription-update", "", false);
              }
            }
            return;
          }
        }
      } catch (e) {
      }
    }
  }
  const isRes = isResultLine(trimmed);
  if (isRes) {
    win.webContents.send("log-update", trimmed + "\n");
    if (mode !== "mic") {
      win.webContents.send("transcription-update", trimmed, true);
    }
  } else {
    win.webContents.send("log-update", trimmed + "\n");
  }
}
function startCrispBackendInstance(mode, payload) {
  var _a;
  if (crispAsrProcess) {
    try {
      crispAsrProcess.kill("SIGKILL");
    } catch (e) {
      console.error("Failed to kill previous backend:", e);
    }
    crispAsrProcess = null;
  }
  const basePath = electron.app.isPackaged ? process.resourcesPath : path.join(__dirname, "..");
  const dirName = `crispasr-windows-x86_64-${settings.backend}`;
  const binPath = path.join(basePath, dirName, "crispasr.exe");
  const modelPath = path.join(basePath, "models-cache", "parakeet-tdt-0.6b-v3-q4_k.gguf");
  const ffmpegBinPath = path.join(basePath, "ffmpeg", "bin");
  const ffmpegRootPath = path.join(basePath, "ffmpeg");
  if (!fs.existsSync(binPath)) {
    console.log(`[SIMULATED ASR] Backend binary not found at ${binPath}. Simulating output.`);
    win == null ? void 0 : win.webContents.send("log-update", `[SYSTEM] Backend not found at ${binPath}
`);
    setTimeout(() => {
      processAsrLogLine('{"type":"silence","t":1.000}', mode);
    }, 1e3);
    setTimeout(() => {
      processAsrLogLine("Recognized test transcription.", mode);
      stopMicrophone();
    }, 3e3);
    return;
  }
  const args = [
    "-m",
    modelPath,
    "-t",
    settings.threads.toString(),
    "-dev",
    settings.gpuId.toString()
  ];
  if (settings.language) {
    args.push("-l", settings.language);
  }
  args.push("--stream-json");
  args.push("--vad");
  if (settings.mode === "lowest-latency") {
    args.push("--stream-final-on-silence-ms", "40");
  } else {
    args.push("--stream-final-on-silence-ms", "1250");
  }
  if (mode === "mic") {
    args.push("--mic");
  } else if (mode === "file" && payload) {
    args.push("-f", payload);
  }
  if (mode === "mic") {
    micLastUtteranceId = -1;
  }
  win == null ? void 0 : win.webContents.send("log-update", `[SYSTEM] Starting backend: ${binPath} 
[SYSTEM] Args: ${args.join(" ")}
`);
  try {
    const env = Object.assign({}, process.env);
    env.PATH = `${ffmpegBinPath}${path.delimiter}${ffmpegRootPath}${path.delimiter}${env.PATH}`;
    console.log(`===DIAG=== [Main PID:${process.pid}] about to spawn crispasr.exe (mode=${mode})`);
    crispAsrProcess = child_process.spawn(binPath, args, {
      cwd: path.dirname(binPath),
      env
    });
    const childPid = crispAsrProcess.pid;
    console.log(`===DIAG=== [Main PID:${process.pid}] SPAWNED crispasr.exe child PID=${childPid}`);
    if (crispAsrProcess.stdout) {
      const rl = readline__namespace.createInterface({
        input: crispAsrProcess.stdout,
        crlfDelay: Infinity
      });
      rl.on("line", (line) => {
        processAsrLogLine(line, mode);
      });
    }
    (_a = crispAsrProcess.stderr) == null ? void 0 : _a.on("data", (err) => {
      const msg = err.toString();
      console.log("Backend Error:", msg);
      win == null ? void 0 : win.webContents.send("log-update", `[LOG] ${msg}`);
    });
    crispAsrProcess.on("close", (code) => {
      console.log(`===DIAG=== [Main PID:${process.pid}] child PID=${childPid} EXITED code=${code}`);
      console.log(`Backend process exited with code ${code}`);
      crispAsrProcess = null;
      win == null ? void 0 : win.webContents.send("log-update", `
[SYSTEM] Backend process exited with code ${code}
`);
      if (isRecording) {
        stopMicrophone();
      }
    });
  } catch (e) {
    console.error("Failed to spawn CrispASR:", e);
    win == null ? void 0 : win.webContents.send("log-update", `
[SYSTEM ERROR] Failed to spawn process: ${e.message}
`);
  }
}
let pasteInProgress = false;
let uiAutoPaste = false;
function executePasteIntoActiveApp(text) {
  if (!text) return;
  if (pasteInProgress) {
    console.log("===DIAG=== paste already in progress, skipping");
    return;
  }
  pasteInProgress = true;
  electron.clipboard.writeText(text);
  setTimeout(() => {
    const psScript = `
$code = @"
using System;
using System.Runtime.InteropServices;
public class KeySim {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, IntPtr dwExtraInfo);
  public static void CtrlV() {
    keybd_event(0x11, 0, 0, IntPtr.Zero);
    System.Threading.Thread.Sleep(15);
    keybd_event(0x56, 0, 0, IntPtr.Zero);
    System.Threading.Thread.Sleep(15);
    keybd_event(0x56, 0, 2, IntPtr.Zero);
    System.Threading.Thread.Sleep(15);
    keybd_event(0x11, 0, 2, IntPtr.Zero);
  }
}
"@
Add-Type -TypeDefinition $code
[KeySim]::CtrlV()
`;
    const encoded = Buffer.from(psScript, "utf16le").toString("base64");
    child_process.exec(
      `powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
      (err) => {
        pasteInProgress = false;
        if (err) {
          console.error("Auto-paste keystroke error:", err);
        }
      }
    );
  }, 250);
}
function startMicrophone() {
  console.log(`===DIAG=== [Main PID:${process.pid}] startMicrophone() ENTERED, isRecording=${isRecording}, crispAsrProcess=${crispAsrProcess ? "set" : "null"}`);
  if (isRecording) {
    console.log(`===DIAG=== [Main PID:${process.pid}] startMicrophone() BLOCKED by guard (already recording)`);
    return;
  }
  isRecording = true;
  interimTranscript = "";
  tray == null ? void 0 : tray.setImage(REC_ICON);
  win == null ? void 0 : win.webContents.send("recording-state", true);
  startCrispBackendInstance("mic");
}
function stopMicrophone() {
  if (!isRecording) {
    return;
  }
  isRecording = false;
  tray == null ? void 0 : tray.setImage(IDLE_ICON);
  win == null ? void 0 : win.webContents.send("recording-state", false);
  if (crispAsrProcess) {
    try {
      crispAsrProcess.kill("SIGKILL");
    } catch (e) {
      console.error("Failed to kill backend on stop:", e);
    }
    crispAsrProcess = null;
  }
  const finalText = interimTranscript.trim();
  if (finalText.length === 0) {
    return;
  }
  if (settings.autoPaste || uiAutoPaste) {
    electron.clipboard.writeText(finalText);
    win == null ? void 0 : win.webContents.send("show-toast", {
      message: t(curLocale(), "toast.inserted"),
      preview: finalText.length > 60 ? finalText.slice(0, 60) + "…" : finalText
    });
  } else {
    electron.clipboard.writeText(finalText);
    win == null ? void 0 : win.webContents.send("show-toast", {
      message: t(curLocale(), "toast.copied"),
      preview: finalText.length > 60 ? finalText.slice(0, 60) + "…" : finalText
    });
  }
}
electron.ipcMain.handle("get-settings", () => settings);
electron.ipcMain.handle("save-settings", (_e, newSettings) => {
  settings = newSettings;
  saveSettings();
  return true;
});
electron.ipcMain.handle("set-auto-paste", (_e, value) => {
  setAutoPaste(value);
  return settings.autoPaste;
});
electron.ipcMain.handle("open-external", (_e, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    electron.shell.openExternal(url);
  }
  return true;
});
electron.ipcMain.handle("set-ui-auto-paste", (_e, value) => {
  uiAutoPaste = !!value;
  return uiAutoPaste;
});
electron.ipcMain.handle("clear-transcript", () => {
  interimTranscript = "";
  micLastUtteranceId = -1;
  win == null ? void 0 : win.webContents.send("transcription-clear");
  return true;
});
electron.ipcMain.on("close-app", () => {
  win == null ? void 0 : win.close();
});
electron.ipcMain.on("minimize-app", () => {
  win == null ? void 0 : win.minimize();
});
electron.ipcMain.handle("start-mic", () => {
  console.log(`===DIAG=== [Main PID:${process.pid}] IPC 'start-mic' RECEIVED at ${(/* @__PURE__ */ new Date()).toISOString()}`);
  startMicrophone();
});
electron.ipcMain.handle("stop-mic", () => {
  console.log(`===DIAG=== [Main PID:${process.pid}] IPC 'stop-mic' RECEIVED at ${(/* @__PURE__ */ new Date()).toISOString()}`);
  stopMicrophone();
});
electron.ipcMain.handle("transcribe-file", async () => {
  if (!win) return;
  const result = await electron.dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [{ name: "Audio", extensions: ["wav", "mp3", "ogg", "opus"] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    interimTranscript = "";
    startCrispBackendInstance("file", result.filePaths[0]);
  }
});
electron.app.whenReady().then(() => {
  console.log(`===DIAG=== [Main PID:${process.pid}] app.whenReady() — Electron main process started at ${(/* @__PURE__ */ new Date()).toISOString()}`);
  loadSettings();
  createWindow();
  createTray();
  registerHotkeys();
});
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
  if (crispAsrProcess) crispAsrProcess.kill();
});
