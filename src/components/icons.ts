import { defineComponent, h, type PropType } from 'vue'
import AppIcon from './Icon.vue'

export type IconTag = 'path' | 'line' | 'polyline' | 'polygon' | 'circle' | 'rect' | 'ellipse'
export type IconNode = readonly [tag: IconTag, attrs: Readonly<Record<string, string>>]
export type IconSize = number | string

export interface AppIconProps {
  name: AppIconName
  size?: IconSize
  strokeWidth?: number
  title?: string
  fill?: string
  stroke?: string
}

/** Exact path/line/circle data copied from the bundled Lucide SVG definitions. */
const canonicalIcons = {
  Activity: [
    ['path', {'d': 'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2'}]
  ],
  AppWindow: [
    ['rect', {'x': '2', 'y': '4', 'width': '20', 'height': '16', 'rx': '2'}],
    ['path', {'d': 'M10 4v4'}],
    ['path', {'d': 'M2 8h20'}],
    ['path', {'d': 'M6 4v4'}]
  ],
  Archive: [
    ['rect', {'width': '20', 'height': '5', 'x': '2', 'y': '3', 'rx': '1'}],
    ['path', {'d': 'M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8'}],
    ['path', {'d': 'M10 12h4'}]
  ],
  ArchiveRestore: [
    ['rect', {'width': '20', 'height': '5', 'x': '2', 'y': '3', 'rx': '1'}],
    ['path', {'d': 'M4 8v11a2 2 0 0 0 2 2h2'}],
    ['path', {'d': 'M20 8v11a2 2 0 0 1-2 2h-2'}],
    ['path', {'d': 'm9 15 3-3 3 3'}],
    ['path', {'d': 'M12 12v9'}]
  ],
  ArrowDown: [
    ['path', {'d': 'M12 5v14'}],
    ['path', {'d': 'm19 12-7 7-7-7'}]
  ],
  ArrowUp: [
    ['path', {'d': 'm5 12 7-7 7 7'}],
    ['path', {'d': 'M12 19V5'}]
  ],
  ArrowUpDown: [
    ['path', {'d': 'm21 16-4 4-4-4'}],
    ['path', {'d': 'M17 20V4'}],
    ['path', {'d': 'm3 8 4-4 4 4'}],
    ['path', {'d': 'M7 4v16'}]
  ],
  ArrowUpRight: [
    ['path', {'d': 'M7 7h10v10'}],
    ['path', {'d': 'M7 17 17 7'}]
  ],
  AtSign: [
    ['circle', {'cx': '12', 'cy': '12', 'r': '4'}],
    ['path', {'d': 'M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8'}]
  ],
  Bell: [
    ['path', {'d': 'M10.268 21a2 2 0 0 0 3.464 0'}],
    ['path', {'d': 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'}]
  ],
  BookOpen: [
    ['path', {'d': 'M12 5v16'}],
    ['path', {'d': 'M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z'}]
  ],
  Bot: [
    ['path', {'d': 'M12 8V4H8'}],
    ['rect', {'width': '16', 'height': '12', 'x': '4', 'y': '8', 'rx': '2'}],
    ['path', {'d': 'M2 14h2'}],
    ['path', {'d': 'M20 14h2'}],
    ['path', {'d': 'M15 13v2'}],
    ['path', {'d': 'M9 13v2'}]
  ],
  Camera: [
    ['path', {'d': 'M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z'}],
    ['circle', {'cx': '12', 'cy': '13', 'r': '3'}]
  ],
  Check: [
    ['path', {'d': 'M20 6 9 17l-5-5'}]
  ],
  CheckCheck: [
    ['path', {'d': 'M18 6 7 17l-5-5'}],
    ['path', {'d': 'm22 10-7.5 7.5L13 16'}]
  ],
  ChevronDown: [
    ['path', {'d': 'm6 9 6 6 6-6'}]
  ],
  ChevronLeft: [
    ['path', {'d': 'm15 18-6-6 6-6'}]
  ],
  ChevronRight: [
    ['path', {'d': 'm9 18 6-6-6-6'}]
  ],
  CircleAlert: [
    ['circle', {'cx': '12', 'cy': '12', 'r': '10'}],
    ['line', {'x1': '12', 'x2': '12', 'y1': '8', 'y2': '12'}],
    ['line', {'x1': '12', 'x2': '12.01', 'y1': '16', 'y2': '16'}]
  ],
  CircleCheck: [
    ['circle', {'cx': '12', 'cy': '12', 'r': '10'}],
    ['path', {'d': 'm9 12 2 2 4-4'}]
  ],
  CircleHelp: [
    ['circle', {'cx': '12', 'cy': '12', 'r': '10'}],
    ['path', {'d': 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'}],
    ['path', {'d': 'M12 17h.01'}]
  ],
  ClipboardPaste: [
    ['path', {'d': 'M11 14h10'}],
    ['path', {'d': 'M16 4h2a2 2 0 0 1 2 2v1.344'}],
    ['path', {'d': 'm17 18 4-4-4-4'}],
    ['path', {'d': 'M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113'}],
    ['rect', {'x': '8', 'y': '2', 'width': '8', 'height': '4', 'rx': '1'}]
  ],
  Clock: [
    ['circle', {'cx': '12', 'cy': '12', 'r': '10'}],
    ['path', {'d': 'M12 6v6l4 2'}]
  ],
  CloudDownload: [
    ['path', {'d': 'M12 13v8l-4-4'}],
    ['path', {'d': 'm12 21 4-4'}],
    ['path', {'d': 'M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284'}]
  ],
  Code2: [
    ['path', {'d': 'm18 16 4-4-4-4'}],
    ['path', {'d': 'm6 8-4 4 4 4'}],
    ['path', {'d': 'm14.5 4-5 16'}]
  ],
  Database: [
    ['ellipse', {'cx': '12', 'cy': '5', 'rx': '9', 'ry': '3'}],
    ['path', {'d': 'M3 5V19A9 3 0 0 0 21 19V5'}],
    ['path', {'d': 'M3 12A9 3 0 0 0 21 12'}]
  ],
  Download: [
    ['path', {'d': 'M12 15V3'}],
    ['path', {'d': 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'}],
    ['path', {'d': 'm7 10 5 5 5-5'}]
  ],
  Copy: [
    ['rect', {'width': '14', 'height': '14', 'x': '8', 'y': '8', 'rx': '2', 'ry': '2'}],
    ['path', {'d': 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'}]
  ],
  Dot: [
    ['circle', {'cx': '12', 'cy': '12', 'r': '1'}]
  ],
  ExternalLink: [
    ['path', {'d': 'M15 3h6v6'}],
    ['path', {'d': 'M10 14 21 3'}],
    ['path', {'d': 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'}]
  ],
  FileDiff: [
    ['path', {'d': 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'}],
    ['path', {'d': 'M9 10h6'}],
    ['path', {'d': 'M12 13V7'}],
    ['path', {'d': 'M9 17h6'}]
  ],
  FileSpreadsheet: [
    ['path', {'d': 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'}],
    ['path', {'d': 'M14 2v5a1 1 0 0 0 1 1h5'}],
    ['path', {'d': 'M8 13h2'}],
    ['path', {'d': 'M14 13h2'}],
    ['path', {'d': 'M8 17h2'}],
    ['path', {'d': 'M14 17h2'}]
  ],
  FileText: [
    ['path', {'d': 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'}],
    ['path', {'d': 'M14 2v5a1 1 0 0 0 1 1h5'}],
    ['path', {'d': 'M10 9H8'}],
    ['path', {'d': 'M16 13H8'}],
    ['path', {'d': 'M16 17H8'}]
  ],
  Folder: [
    ['path', {'d': 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'}]
  ],
  FolderOpen: [
    ['path', {'d': 'm6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2'}]
  ],
  FolderPlus: [
    ['path', {'d': 'M12 10v6'}],
    ['path', {'d': 'M9 13h6'}],
    ['path', {'d': 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'}]
  ],
  GripVertical: [
    ['circle', {'cx': '9', 'cy': '12', 'r': '1'}],
    ['circle', {'cx': '9', 'cy': '5', 'r': '1'}],
    ['circle', {'cx': '9', 'cy': '19', 'r': '1'}],
    ['circle', {'cx': '15', 'cy': '12', 'r': '1'}],
    ['circle', {'cx': '15', 'cy': '5', 'r': '1'}],
    ['circle', {'cx': '15', 'cy': '19', 'r': '1'}]
  ],
  Globe2: [
    ['path', {'d': 'M21.54 15H17a2 2 0 0 0-2 2v4.54'}],
    ['path', {'d': 'M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17'}],
    ['path', {'d': 'M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05'}],
    ['circle', {'cx': '12', 'cy': '12', 'r': '10'}]
  ],
  GitFork: [
    ['circle', {'cx': '12', 'cy': '18', 'r': '3'}],
    ['circle', {'cx': '6', 'cy': '6', 'r': '3'}],
    ['circle', {'cx': '18', 'cy': '6', 'r': '3'}],
    ['path', {'d': 'M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9'}],
    ['path', {'d': 'M12 12v3'}]
  ],
  GitPullRequestArrow: [
    ['circle', {'cx': '5', 'cy': '6', 'r': '3'}],
    ['path', {'d': 'M5 9v12'}],
    ['circle', {'cx': '19', 'cy': '18', 'r': '3'}],
    ['path', {'d': 'm15 9-3-3 3-3'}],
    ['path', {'d': 'M12 6h5a2 2 0 0 1 2 2v7'}]
  ],
  Image: [
    ['rect', {'width': '18', 'height': '18', 'x': '3', 'y': '3', 'rx': '2', 'ry': '2'}],
    ['circle', {'cx': '9', 'cy': '9', 'r': '2'}],
    ['path', {'d': 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'}]
  ],
  Info: [
    ['circle', {'cx': '12', 'cy': '12', 'r': '10'}],
    ['path', {'d': 'M12 16v-4'}],
    ['path', {'d': 'M12 8h.01'}]
  ],
  Keyboard: [
    ['path', {'d': 'M10 8h.01'}],
    ['path', {'d': 'M12 12h.01'}],
    ['path', {'d': 'M14 8h.01'}],
    ['path', {'d': 'M16 12h.01'}],
    ['path', {'d': 'M18 8h.01'}],
    ['path', {'d': 'M6 8h.01'}],
    ['path', {'d': 'M7 16h10'}],
    ['path', {'d': 'M8 12h.01'}],
    ['rect', {'width': '20', 'height': '16', 'x': '2', 'y': '4', 'rx': '2'}]
  ],
  KeyRound: [
    ['path', {'d': 'M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z'}],
    ['circle', {'cx': '16.5', 'cy': '7.5', 'r': '.5', 'fill': 'currentColor'}]
  ],
  Link: [
    ['path', {'d': 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'}],
    ['path', {'d': 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'}]
  ],
  ListChecks: [
    ['path', {'d': 'M13 5h8'}],
    ['path', {'d': 'M13 12h8'}],
    ['path', {'d': 'M13 19h8'}],
    ['path', {'d': 'm3 17 2 2 4-4'}],
    ['path', {'d': 'm3 7 2 2 4-4'}]
  ],
  LogOut: [
    ['path', {'d': 'm16 17 5-5-5-5'}],
    ['path', {'d': 'M21 12H9'}],
    ['path', {'d': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'}]
  ],
  Mic: [
    ['path', {'d': 'M12 19v3'}],
    ['path', {'d': 'M19 10v2a7 7 0 0 1-14 0v-2'}],
    ['rect', {'x': '9', 'y': '2', 'width': '6', 'height': '13', 'rx': '3'}]
  ],
  Minus: [
    ['path', {'d': 'M5 12h14'}]
  ],
  MessageSquare: [
    ['path', {'d': 'M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z'}]
  ],
  MessageSquarePlus: [
    ['path', {'d': 'M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z'}],
    ['path', {'d': 'M12 8v6'}],
    ['path', {'d': 'M9 11h6'}]
  ],
  Monitor: [
    ['rect', {'width': '20', 'height': '14', 'x': '2', 'y': '3', 'rx': '2'}],
    ['line', {'x1': '8', 'x2': '16', 'y1': '21', 'y2': '21'}],
    ['line', {'x1': '12', 'x2': '12', 'y1': '17', 'y2': '21'}]
  ],
  Moon: [
    ['path', {'d': 'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401'}]
  ],
  MoreHorizontal: [
    ['circle', {'cx': '12', 'cy': '12', 'r': '1'}],
    ['circle', {'cx': '19', 'cy': '12', 'r': '1'}],
    ['circle', {'cx': '5', 'cy': '12', 'r': '1'}]
  ],
  Music: [
    ['path', {'d': 'M9 18V5l12-2v13'}],
    ['circle', {'cx': '6', 'cy': '18', 'r': '3'}],
    ['circle', {'cx': '18', 'cy': '16', 'r': '3'}]
  ],
  Palette: [
    ['path', {'d': 'M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z'}],
    ['circle', {'cx': '13.5', 'cy': '6.5', 'r': '.5', 'fill': 'currentColor'}],
    ['circle', {'cx': '17.5', 'cy': '10.5', 'r': '.5', 'fill': 'currentColor'}],
    ['circle', {'cx': '6.5', 'cy': '12.5', 'r': '.5', 'fill': 'currentColor'}],
    ['circle', {'cx': '8.5', 'cy': '7.5', 'r': '.5', 'fill': 'currentColor'}]
  ],
  Paperclip: [
    ['path', {'d': 'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'}]
  ],
  PanelLeft: [
    ['rect', {'width': '18', 'height': '18', 'x': '3', 'y': '3', 'rx': '2'}],
    ['path', {'d': 'M9 3v18'}]
  ],
  PanelRight: [
    ['rect', {'width': '18', 'height': '18', 'x': '3', 'y': '3', 'rx': '2'}],
    ['path', {'d': 'M15 3v18'}]
  ],
  PanelRightOpen: [
    ['rect', {'width': '18', 'height': '18', 'x': '3', 'y': '3', 'rx': '2'}],
    ['path', {'d': 'M15 3v18'}],
    ['path', {'d': 'm10 15-3-3 3-3'}]
  ],
  Maximize2: [
    ['path', {'d': 'M15 3h6v6'}],
    ['path', {'d': 'm21 3-7 7'}],
    ['path', {'d': 'm3 21 7-7'}],
    ['path', {'d': 'M9 21H3v-6'}]
  ],
  Minimize2: [
    ['path', {'d': 'm14 10 7-7'}],
    ['path', {'d': 'M20 10h-6V4'}],
    ['path', {'d': 'm3 21 7-7'}],
    ['path', {'d': 'M4 14h6v6'}]
  ],
  PawPrint: [
    ['circle', {'cx': '11', 'cy': '4', 'r': '2'}],
    ['circle', {'cx': '18', 'cy': '8', 'r': '2'}],
    ['circle', {'cx': '20', 'cy': '16', 'r': '2'}],
    ['path', {'d': 'M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z'}]
  ],
  PencilLine: [
    ['path', {'d': 'M13 21h8'}],
    ['path', {'d': 'm15 5 4 4'}],
    ['path', {'d': 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'}]
  ],
  Pin: [
    ['path', {'d': 'M12 17v5'}],
    ['path', {'d': 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z'}]
  ],
  Play: [
    ['path', {'d': 'M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z'}]
  ],
  Plug: [
    ['path', {'d': 'M12 22v-5'}],
    ['path', {'d': 'M15 8V2'}],
    ['path', {'d': 'M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z'}],
    ['path', {'d': 'M9 8V2'}]
  ],
  Plus: [
    ['path', {'d': 'M5 12h14'}],
    ['path', {'d': 'M12 5v14'}]
  ],
  Power: [
    ['path', {'d': 'M12 2v10'}],
    ['path', {'d': 'M18.4 6.6a9 9 0 1 1-12.77.04'}]
  ],
  RefreshCcw: [
    ['path', {'d': 'M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'}],
    ['path', {'d': 'M3 3v5h5'}],
    ['path', {'d': 'M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16'}],
    ['path', {'d': 'M16 16h5v5'}]
  ],
  RefreshCw: [
    ['path', {'d': 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'}],
    ['path', {'d': 'M21 3v5h-5'}],
    ['path', {'d': 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'}],
    ['path', {'d': 'M8 16H3v5'}]
  ],
  RotateCw: [
    ['path', {'d': 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'}],
    ['path', {'d': 'M21 3v5h-5'}]
  ],
  Search: [
    ['path', {'d': 'm21 21-4.34-4.34'}],
    ['circle', {'cx': '11', 'cy': '11', 'r': '8'}]
  ],
  Server: [
    ['rect', {'width': '20', 'height': '8', 'x': '2', 'y': '2', 'rx': '2', 'ry': '2'}],
    ['rect', {'width': '20', 'height': '8', 'x': '2', 'y': '14', 'rx': '2', 'ry': '2'}],
    ['line', {'x1': '6', 'x2': '6.01', 'y1': '6', 'y2': '6'}],
    ['line', {'x1': '6', 'x2': '6.01', 'y1': '18', 'y2': '18'}]
  ],
  Settings: [
    ['path', {'d': 'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915'}],
    ['circle', {'cx': '12', 'cy': '12', 'r': '3'}]
  ],
  Shield: [
    ['path', {'d': 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'}]
  ],
  SlidersHorizontal: [
    ['path', {'d': 'M10 5H3'}],
    ['path', {'d': 'M12 19H3'}],
    ['path', {'d': 'M14 3v4'}],
    ['path', {'d': 'M16 17v4'}],
    ['path', {'d': 'M21 12h-9'}],
    ['path', {'d': 'M21 19h-5'}],
    ['path', {'d': 'M21 5h-7'}],
    ['path', {'d': 'M8 10v4'}],
    ['path', {'d': 'M8 12H3'}]
  ],
  Slash: [
    ['path', {'d': 'M22 2 2 22'}]
  ],
  Smile: [
    ['path', {'d': 'M15 10V9'}],
    ['path', {'d': 'M16.472 15a6 6 0 01-8.943 0'}],
    ['path', {'d': 'M9 10V9'}],
    ['circle', {'cx': '12', 'cy': '12', 'r': '10'}]
  ],
  Sparkles: [
    ['path', {'d': 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z'}],
    ['path', {'d': 'M20 2v4'}],
    ['path', {'d': 'M22 4h-4'}],
    ['circle', {'cx': '4', 'cy': '20', 'r': '2'}]
  ],
  Square: [
    ['rect', {'width': '18', 'height': '18', 'x': '3', 'y': '3', 'rx': '2'}]
  ],
  Star: [
    ['path', {'d': 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'}]
  ],
  Sun: [
    ['circle', {'cx': '12', 'cy': '12', 'r': '4'}],
    ['path', {'d': 'M12 2v2'}],
    ['path', {'d': 'M12 20v2'}],
    ['path', {'d': 'm4.93 4.93 1.41 1.41'}],
    ['path', {'d': 'm17.66 17.66 1.41 1.41'}],
    ['path', {'d': 'M2 12h2'}],
    ['path', {'d': 'M20 12h2'}],
    ['path', {'d': 'm6.34 17.66-1.41 1.41'}],
    ['path', {'d': 'm19.07 4.93-1.41 1.41'}]
  ],
  Target: [
    ['circle', {'cx': '12', 'cy': '12', 'r': '10'}],
    ['circle', {'cx': '12', 'cy': '12', 'r': '6'}],
    ['circle', {'cx': '12', 'cy': '12', 'r': '2'}]
  ],
  Terminal: [
    ['path', {'d': 'M12 19h8'}],
    ['path', {'d': 'm4 17 6-6-6-6'}]
  ],
  TextQuote: [
    ['path', {'d': 'M17 5H3'}],
    ['path', {'d': 'M21 12H8'}],
    ['path', {'d': 'M21 19H8'}],
    ['path', {'d': 'M3 12v7'}]
  ],
  Trash2: [
    ['path', {'d': 'M10 11v6'}],
    ['path', {'d': 'M14 11v6'}],
    ['path', {'d': 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'}],
    ['path', {'d': 'M3 6h18'}],
    ['path', {'d': 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'}]
  ],
  TriangleAlert: [
    ['path', {'d': 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'}],
    ['path', {'d': 'M12 9v4'}],
    ['path', {'d': 'M12 17h.01'}]
  ],
  UserRound: [
    ['circle', {'cx': '12', 'cy': '8', 'r': '5'}],
    ['path', {'d': 'M20 21a8 8 0 0 0-16 0'}]
  ],
  Undo2: [
    ['path', {'d': 'M9 14 4 9l5-5'}],
    ['path', {'d': 'M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11'}]
  ],
  Video: [
    ['path', {'d': 'm16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5'}],
    ['rect', {'x': '2', 'y': '6', 'width': '14', 'height': '12', 'rx': '2'}]
  ],
  Webhook: [
    ['path', {'d': 'M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2'}],
    ['path', {'d': 'm6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06'}],
    ['path', {'d': 'm12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8'}]
  ],
  Workflow: [
    ['rect', {'width': '8', 'height': '8', 'x': '3', 'y': '3', 'rx': '2'}],
    ['path', {'d': 'M7 11v4a2 2 0 0 0 2 2h4'}],
    ['rect', {'width': '8', 'height': '8', 'x': '13', 'y': '13', 'rx': '2'}]
  ],
  Wrench: [
    ['path', {'d': 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z'}]
  ],
  X: [
    ['path', {'d': 'M18 6 6 18'}],
    ['path', {'d': 'm6 6 12 12'}]
  ],
  House: [
    ['path', {'d': 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'}],
    ['path', {'d': 'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'}]
  ],
  Send: [
    ['path', {'d': 'M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z'}],
    ['path', {'d': 'm21.854 2.147-10.94 10.939'}]
  ],
  Diamond: [
    ['path', {'d': 'M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z'}]
  ],
  CircleDot: [
    ['circle', {'cx': '12', 'cy': '12', 'r': '10'}],
    ['circle', {'cx': '12', 'cy': '12', 'r': '1'}]
  ],
  WandSparkles: [
    ['path', {'d': 'm21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72'}],
    ['path', {'d': 'm14 7 3 3'}],
    ['path', {'d': 'M5 6v4'}],
    ['path', {'d': 'M19 14v4'}],
    ['path', {'d': 'M10 2v2'}],
    ['path', {'d': 'M7 8H3'}],
    ['path', {'d': 'M21 16h-4'}],
    ['path', {'d': 'M11 3H9'}]
  ],
  Brain: [
    ['path', {'d': 'M12 18V5'}],
    ['path', {'d': 'M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4'}],
    ['path', {'d': 'M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5'}],
    ['path', {'d': 'M17.997 5.125a4 4 0 0 1 2.526 5.77'}],
    ['path', {'d': 'M18 18a4 4 0 0 0 2-7.464'}],
    ['path', {'d': 'M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517'}],
    ['path', {'d': 'M6 18a4 4 0 0 1-2-7.464'}],
    ['path', {'d': 'M6.003 5.125a4 4 0 0 0-2.526 5.77'}]
  ]
} as const satisfies Record<string, readonly IconNode[]>

const iconAliases = {
  'activity': canonicalIcons.Activity,
  'app-window': canonicalIcons.AppWindow,
  appWindow: canonicalIcons.AppWindow,
  'archive': canonicalIcons.Archive,
  'archive-restore': canonicalIcons.ArchiveRestore,
  archiveRestore: canonicalIcons.ArchiveRestore,
  'arrow-down': canonicalIcons.ArrowDown,
  arrowDown: canonicalIcons.ArrowDown,
  'arrow-up': canonicalIcons.ArrowUp,
  arrowUp: canonicalIcons.ArrowUp,
  'arrow-up-down': canonicalIcons.ArrowUpDown,
  arrowUpDown: canonicalIcons.ArrowUpDown,
  'arrow-up-right': canonicalIcons.ArrowUpRight,
  arrowUpRight: canonicalIcons.ArrowUpRight,
  'at-sign': canonicalIcons.AtSign,
  atSign: canonicalIcons.AtSign,
  'bell': canonicalIcons.Bell,
  'book-open': canonicalIcons.BookOpen,
  bookOpen: canonicalIcons.BookOpen,
  'bot': canonicalIcons.Bot,
  'camera': canonicalIcons.Camera,
  'check': canonicalIcons.Check,
  'check-check': canonicalIcons.CheckCheck,
  checkCheck: canonicalIcons.CheckCheck,
  'chevron-down': canonicalIcons.ChevronDown,
  chevronDown: canonicalIcons.ChevronDown,
  'chevron-left': canonicalIcons.ChevronLeft,
  chevronLeft: canonicalIcons.ChevronLeft,
  'chevron-right': canonicalIcons.ChevronRight,
  chevronRight: canonicalIcons.ChevronRight,
  'circle-alert': canonicalIcons.CircleAlert,
  circleAlert: canonicalIcons.CircleAlert,
  'circle-check': canonicalIcons.CircleCheck,
  circleCheck: canonicalIcons.CircleCheck,
  'circle-help': canonicalIcons.CircleHelp,
  circleHelp: canonicalIcons.CircleHelp,
  'clipboard-paste': canonicalIcons.ClipboardPaste,
  clipboardPaste: canonicalIcons.ClipboardPaste,
  'clock': canonicalIcons.Clock,
  'cloud-download': canonicalIcons.CloudDownload,
  cloudDownload: canonicalIcons.CloudDownload,
  'code-2': canonicalIcons.Code2,
  code2: canonicalIcons.Code2,
  'database': canonicalIcons.Database,
  'download': canonicalIcons.Download,
  'copy': canonicalIcons.Copy,
  'dot': canonicalIcons.Dot,
  'external-link': canonicalIcons.ExternalLink,
  externalLink: canonicalIcons.ExternalLink,
  'file-diff': canonicalIcons.FileDiff,
  fileDiff: canonicalIcons.FileDiff,
  'file-spreadsheet': canonicalIcons.FileSpreadsheet,
  fileSpreadsheet: canonicalIcons.FileSpreadsheet,
  'file-text': canonicalIcons.FileText,
  fileText: canonicalIcons.FileText,
  'folder': canonicalIcons.Folder,
  'folder-open': canonicalIcons.FolderOpen,
  folderOpen: canonicalIcons.FolderOpen,
  'folder-plus': canonicalIcons.FolderPlus,
  folderPlus: canonicalIcons.FolderPlus,
  'grip-vertical': canonicalIcons.GripVertical,
  gripVertical: canonicalIcons.GripVertical,
  'globe-2': canonicalIcons.Globe2,
  globe2: canonicalIcons.Globe2,
  'git-fork': canonicalIcons.GitFork,
  gitFork: canonicalIcons.GitFork,
  'git-pull-request-arrow': canonicalIcons.GitPullRequestArrow,
  gitPullRequestArrow: canonicalIcons.GitPullRequestArrow,
  'image': canonicalIcons.Image,
  'info': canonicalIcons.Info,
  'keyboard': canonicalIcons.Keyboard,
  'key-round': canonicalIcons.KeyRound,
  keyRound: canonicalIcons.KeyRound,
  'link': canonicalIcons.Link,
  'list-checks': canonicalIcons.ListChecks,
  listChecks: canonicalIcons.ListChecks,
  'log-out': canonicalIcons.LogOut,
  logOut: canonicalIcons.LogOut,
  'mic': canonicalIcons.Mic,
  'minus': canonicalIcons.Minus,
  'message-square': canonicalIcons.MessageSquare,
  messageSquare: canonicalIcons.MessageSquare,
  'message-square-plus': canonicalIcons.MessageSquarePlus,
  messageSquarePlus: canonicalIcons.MessageSquarePlus,
  'monitor': canonicalIcons.Monitor,
  'moon': canonicalIcons.Moon,
  'more-horizontal': canonicalIcons.MoreHorizontal,
  moreHorizontal: canonicalIcons.MoreHorizontal,
  'music': canonicalIcons.Music,
  'palette': canonicalIcons.Palette,
  'panel-left': canonicalIcons.PanelLeft,
  panelLeft: canonicalIcons.PanelLeft,
  'panel-right': canonicalIcons.PanelRight,
  panelRight: canonicalIcons.PanelRight,
  'panel-right-open': canonicalIcons.PanelRightOpen,
  panelRightOpen: canonicalIcons.PanelRightOpen,
  'maximize-2': canonicalIcons.Maximize2,
  maximize2: canonicalIcons.Maximize2,
  'minimize-2': canonicalIcons.Minimize2,
  minimize2: canonicalIcons.Minimize2,
  'paw-print': canonicalIcons.PawPrint,
  pawPrint: canonicalIcons.PawPrint,
  'pencil-line': canonicalIcons.PencilLine,
  pencilLine: canonicalIcons.PencilLine,
  'pin': canonicalIcons.Pin,
  'play': canonicalIcons.Play,
  'plug': canonicalIcons.Plug,
  'plus': canonicalIcons.Plus,
  'power': canonicalIcons.Power,
  'refresh-ccw': canonicalIcons.RefreshCcw,
  refreshCcw: canonicalIcons.RefreshCcw,
  'refresh-cw': canonicalIcons.RefreshCw,
  refreshCw: canonicalIcons.RefreshCw,
  'rotate-cw': canonicalIcons.RotateCw,
  rotateCw: canonicalIcons.RotateCw,
  'search': canonicalIcons.Search,
  'server': canonicalIcons.Server,
  'settings': canonicalIcons.Settings,
  'shield': canonicalIcons.Shield,
  'sliders-horizontal': canonicalIcons.SlidersHorizontal,
  slidersHorizontal: canonicalIcons.SlidersHorizontal,
  'slash': canonicalIcons.Slash,
  'smile': canonicalIcons.Smile,
  'sparkles': canonicalIcons.Sparkles,
  'square': canonicalIcons.Square,
  'star': canonicalIcons.Star,
  'sun': canonicalIcons.Sun,
  'target': canonicalIcons.Target,
  'terminal': canonicalIcons.Terminal,
  'text-quote': canonicalIcons.TextQuote,
  textQuote: canonicalIcons.TextQuote,
  'trash-2': canonicalIcons.Trash2,
  trash2: canonicalIcons.Trash2,
  'triangle-alert': canonicalIcons.TriangleAlert,
  triangleAlert: canonicalIcons.TriangleAlert,
  'user-round': canonicalIcons.UserRound,
  userRound: canonicalIcons.UserRound,
  'undo-2': canonicalIcons.Undo2,
  undo2: canonicalIcons.Undo2,
  'video': canonicalIcons.Video,
  'webhook': canonicalIcons.Webhook,
  'workflow': canonicalIcons.Workflow,
  'wrench': canonicalIcons.Wrench,
  'x': canonicalIcons.X,
  'house': canonicalIcons.House,
  'send': canonicalIcons.Send,
  'diamond': canonicalIcons.Diamond,
  'circle-dot': canonicalIcons.CircleDot,
  circleDot: canonicalIcons.CircleDot,
  'wand-sparkles': canonicalIcons.WandSparkles,
  wandSparkles: canonicalIcons.WandSparkles,
  'brain': canonicalIcons.Brain,
  home: canonicalIcons.House,
  trash: canonicalIcons.Trash2,
  code: canonicalIcons.Code2,
  launch: canonicalIcons.ExternalLink,
} as const

export const ICON_DEFINITIONS = { ...canonicalIcons, ...iconAliases } as const
export type AppIconName = keyof typeof ICON_DEFINITIONS
export type IconName = AppIconName
export type IconProps = AppIconProps

/** Keep icon boxes proportional to the Appearance font scale. */
export function scaledIconSize(size: IconSize = 16): string {
  if (typeof size === 'number' && Number.isFinite(size)) {
    return `calc(${size}px * var(--font-scale))`
  }
  if (typeof size === 'string' && size.trim()) {
    const value = size.trim()
    return /[a-z%]+$/i.test(value)
      ? `calc(${value} * var(--font-scale))`
      : `calc(${value}px * var(--font-scale))`
  }
  return 'calc(16px * var(--font-scale))'
}

export { AppIcon }
export { AppIcon as default }

const iconProps = {
  size: { type: [Number, String] as PropType<IconSize>, default: undefined },
  strokeWidth: { type: Number, default: undefined },
  title: { type: String, default: undefined },
  fill: { type: String, default: undefined },
  stroke: { type: String, default: undefined },
} as const

function forwardedProps(props: { size?: IconSize; strokeWidth?: number; title?: string; fill?: string; stroke?: string }) {
  return {
    ...(props.size === undefined ? {} : { size: props.size }),
    ...(props.strokeWidth === undefined ? {} : { strokeWidth: props.strokeWidth }),
    ...(props.title === undefined ? {} : { title: props.title }),
    ...(props.fill === undefined ? {} : { fill: props.fill }),
    ...(props.stroke === undefined ? {} : { stroke: props.stroke }),
  }
}

function createIcon(name: AppIconName, componentName: string) {
  return defineComponent({
    name: componentName,
    inheritAttrs: false,
    props: iconProps,
    setup(props, { attrs }) {
      return () => h(AppIcon, { ...attrs, name, ...forwardedProps(props) })
    },
  })
}

export const IconActivity = createIcon('activity', 'IconActivity')
export const IconAppWindow = createIcon('app-window', 'IconAppWindow')
export const IconArchive = createIcon('archive', 'IconArchive')
export const IconArchiveRestore = createIcon('archive-restore', 'IconArchiveRestore')
export const IconArrowDown = createIcon('arrow-down', 'IconArrowDown')
export const IconArrowUp = createIcon('arrow-up', 'IconArrowUp')
export const IconArrowUpDown = createIcon('arrow-up-down', 'IconArrowUpDown')
export const IconArrowUpRight = createIcon('arrow-up-right', 'IconArrowUpRight')
export const IconAtSign = createIcon('at-sign', 'IconAtSign')
export const IconBell = createIcon('bell', 'IconBell')
export const IconBookOpen = createIcon('book-open', 'IconBookOpen')
export const IconBot = createIcon('bot', 'IconBot')
export const IconCamera = createIcon('camera', 'IconCamera')
export const IconCheck = createIcon('check', 'IconCheck')
export const IconCheckCheck = createIcon('check-check', 'IconCheckCheck')
export const IconChevronDown = createIcon('chevron-down', 'IconChevronDown')
export const IconChevronLeft = createIcon('chevron-left', 'IconChevronLeft')
export const IconChevronRight = createIcon('chevron-right', 'IconChevronRight')
export const IconCircleAlert = createIcon('circle-alert', 'IconCircleAlert')
export const IconCircleCheck = createIcon('circle-check', 'IconCircleCheck')
export const IconCircleHelp = createIcon('circle-help', 'IconCircleHelp')
export const IconClipboardPaste = createIcon('clipboard-paste', 'IconClipboardPaste')
export const IconClock = createIcon('clock', 'IconClock')
export const IconCloudDownload = createIcon('cloud-download', 'IconCloudDownload')
export const IconCode2 = createIcon('code-2', 'IconCode2')
export const IconDatabase = createIcon('database', 'IconDatabase')
export const IconDownload = createIcon('download', 'IconDownload')
export const IconCopy = createIcon('copy', 'IconCopy')
export const IconExternalLink = createIcon('external-link', 'IconExternalLink')
export const IconFileDiff = createIcon('file-diff', 'IconFileDiff')
export const IconFileSpreadsheet = createIcon('file-spreadsheet', 'IconFileSpreadsheet')
export const IconFileText = createIcon('file-text', 'IconFileText')
export const IconFolder = createIcon('folder', 'IconFolder')
export const IconFolderOpen = createIcon('folder-open', 'IconFolderOpen')
export const IconFolderPlus = createIcon('folder-plus', 'IconFolderPlus')
export const IconGripVertical = createIcon('grip-vertical', 'IconGripVertical')
export const IconGlobe2 = createIcon('globe-2', 'IconGlobe2')
export const IconGitFork = createIcon('git-fork', 'IconGitFork')
export const IconGitPullRequestArrow = createIcon('git-pull-request-arrow', 'IconGitPullRequestArrow')
export const IconImage = createIcon('image', 'IconImage')
export const IconInfo = createIcon('info', 'IconInfo')
export const IconKeyboard = createIcon('keyboard', 'IconKeyboard')
export const IconKeyRound = createIcon('key-round', 'IconKeyRound')
export const IconLink = createIcon('link', 'IconLink')
export const IconListChecks = createIcon('list-checks', 'IconListChecks')
export const IconLogOut = createIcon('log-out', 'IconLogOut')
export const IconMic = createIcon('mic', 'IconMic')
export const IconMinus = createIcon('minus', 'IconMinus')
export const IconMessageSquare = createIcon('message-square', 'IconMessageSquare')
export const IconMessageSquarePlus = createIcon('message-square-plus', 'IconMessageSquarePlus')
export const IconMonitor = createIcon('monitor', 'IconMonitor')
export const IconMoon = createIcon('moon', 'IconMoon')
export const IconMoreHorizontal = createIcon('more-horizontal', 'IconMoreHorizontal')
export const IconMusic = createIcon('music', 'IconMusic')
export const IconPalette = createIcon('palette', 'IconPalette')
export const IconPanelLeft = createIcon('panel-left', 'IconPanelLeft')
export const IconPanelRight = createIcon('panel-right', 'IconPanelRight')
export const IconPanelRightOpen = createIcon('panel-right-open', 'IconPanelRightOpen')
export const IconMaximize2 = createIcon('maximize-2', 'IconMaximize2')
export const IconMinimize2 = createIcon('minimize-2', 'IconMinimize2')
export const IconPawPrint = createIcon('paw-print', 'IconPawPrint')
export const IconPencilLine = createIcon('pencil-line', 'IconPencilLine')
export const IconPin = createIcon('pin', 'IconPin')
export const IconPlay = createIcon('play', 'IconPlay')
export const IconPlug = createIcon('plug', 'IconPlug')
export const IconPlus = createIcon('plus', 'IconPlus')
export const IconPower = createIcon('power', 'IconPower')
export const IconRefreshCcw = createIcon('refresh-ccw', 'IconRefreshCcw')
export const IconRefreshCw = createIcon('refresh-cw', 'IconRefreshCw')
export const IconRotateCw = createIcon('rotate-cw', 'IconRotateCw')
export const IconSearch = createIcon('search', 'IconSearch')
export const IconServer = createIcon('server', 'IconServer')
export const IconSettings = createIcon('settings', 'IconSettings')
export const IconShield = createIcon('shield', 'IconShield')
export const IconSlidersHorizontal = createIcon('sliders-horizontal', 'IconSlidersHorizontal')
export const IconSlash = createIcon('slash', 'IconSlash')
export const IconSmile = createIcon('smile', 'IconSmile')
export const IconSparkles = createIcon('sparkles', 'IconSparkles')
export const IconSquare = createIcon('square', 'IconSquare')
export const IconStar = createIcon('star', 'IconStar')
export const IconSun = createIcon('sun', 'IconSun')
export const IconTarget = createIcon('target', 'IconTarget')
export const IconTerminal = createIcon('terminal', 'IconTerminal')
export const IconTextQuote = createIcon('text-quote', 'IconTextQuote')
export const IconTrash2 = createIcon('trash-2', 'IconTrash2')
export const IconTriangleAlert = createIcon('triangle-alert', 'IconTriangleAlert')
export const IconUserRound = createIcon('user-round', 'IconUserRound')
export const IconUndo2 = createIcon('undo-2', 'IconUndo2')
export const IconVideo = createIcon('video', 'IconVideo')
export const IconWebhook = createIcon('webhook', 'IconWebhook')
export const IconWorkflow = createIcon('workflow', 'IconWorkflow')
export const IconWrench = createIcon('wrench', 'IconWrench')
export const IconX = createIcon('x', 'IconX')
export const IconHouse = createIcon('house', 'IconHouse')
export const IconSend = createIcon('send', 'IconSend')
export const IconDiamond = createIcon('diamond', 'IconDiamond')
export const IconCircleDot = createIcon('circle-dot', 'IconCircleDot')
export const IconWandSparkles = createIcon('wand-sparkles', 'IconWandSparkles')
export const IconBrain = createIcon('brain', 'IconBrain')


// Stable semantic aliases used by the Vue shell and migrated surfaces.
export const IconSidebar = IconPanelLeft
export const IconPanel = IconPanelRight
export const IconPanelOpen = IconPanelRightOpen
export const IconNewSession = IconMessageSquarePlus
export const IconChat = IconMessageSquare
export const IconMessage = IconMessageSquare
export const IconNewProject = IconFolderPlus
export const IconBranch = IconGitFork
export const IconPullRequest = IconGitPullRequestArrow
export const IconCode = IconCode2
export const IconGlobe = IconGlobe2
export const IconPencil = IconPencilLine
export const IconAt = IconAtSign
export const IconHelp = IconCircleHelp
export const IconClose = IconX
export const IconSliders = IconSlidersHorizontal
export const IconConfig = IconRefreshCcw
export const IconExternal = IconExternalLink
export const IconCloudDown = IconCloudDownload
export const IconSheet = IconFileSpreadsheet
export const IconAudio = IconMusic
export const IconReview = IconRefreshCw
export const IconUser = IconUserRound
export const IconKey = IconKeyRound
export const IconPerson = IconSmile
export const IconGear = IconSettings
export const IconMore = IconMoreHorizontal
export const IconTrash = IconTrash2
export const IconInfoCircle = IconCircleHelp
export const IconDown = IconChevronDown
export const IconRight = IconChevronRight
export const IconLaunch = IconExternalLink
export const IconDelete = IconTrash2
export const IconPlayArrow = IconPlay
export const IconClockCircle = IconClock
export const IconRobot = IconBot
export const IconCommand = IconKeyboard
export const IconFile = IconFileText
export const IconEnhance = IconSparkles
export const IconContext = IconCircleDot
export const IconModel = IconBot

/** Filled stop button matching Lucide's Square geometry. */
export const IconStop = defineComponent({
  name: 'IconStop',
  inheritAttrs: false,
  props: iconProps,
  setup(props, { attrs }) {
    return () => h(AppIcon, { ...attrs, name: 'square', ...forwardedProps(props), strokeWidth: 0, fill: 'currentColor', stroke: 'currentColor' })
  },
})

/** Heavy round-capped dot matching the source app's status marker. */
export const IconDot = defineComponent({
  name: 'IconDot',
  inheritAttrs: false,
  props: iconProps,
  setup(props, { attrs }) {
    return () => h(AppIcon, { ...attrs, name: 'circle-dot', ...forwardedProps(props), strokeWidth: 6.5 })
  },
})

/** VS Code brand mark used by settings integrations; paths are kept as real SVG geometry. */
export const IconVSCode = defineComponent({
  name: 'IconVSCode',
  inheritAttrs: false,
  props: iconProps,
  setup(props, { attrs }) {
    return () => h('svg', {
      ...attrs,
      width: scaledIconSize(props.size ?? 14),
      height: scaledIconSize(props.size ?? 14),
      viewBox: '0 0 24 24',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-hidden': attrs['aria-hidden'] ?? 'true',
    }, [
      h('path', { d: 'M17.5 2.6 21 4.2v15.6l-3.5 1.6-9.2-7.2L3 17V7l5.3-2.8 9.2 7.2V2.6Z', fill: '#0078D4' }),
      h('path', { d: 'M17.5 2.6v11.4L8.3 7.2 17.5 2.6Z', fill: '#0090F1', opacity: '0.92' }),
      h('path', { d: 'M8.3 16.8 17.5 21.4V10.6L8.3 16.8Z', fill: '#0065A9', opacity: '0.95' }),
    ])
  },
})
