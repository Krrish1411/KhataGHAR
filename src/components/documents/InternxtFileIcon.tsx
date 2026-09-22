import React from 'react';
import audioSvg from '../../assets/icons/drive/audio.svg';
import codeSvg from '../../assets/icons/drive/code.svg';
import csvSvg from '../../assets/icons/drive/csv.svg';
import defaultSvg from '../../assets/icons/drive/default.svg';
import excelSvg from '../../assets/icons/drive/excel.svg';
import figmaSvg from '../../assets/icons/drive/figma.svg';
import folderSvg from '../../assets/icons/drive/folder.svg';
import illustratorSvg from '../../assets/icons/drive/illustrator.svg';
import imageSvg from '../../assets/icons/drive/image.svg';
import indesignSvg from '../../assets/icons/drive/indesign.svg';
import pdfSvg from '../../assets/icons/drive/pdf.svg';
import photoshopSvg from '../../assets/icons/drive/photoshop.svg';
import powerpointSvg from '../../assets/icons/drive/powerpoint.svg';
import pptSvg from '../../assets/icons/drive/ppt.svg';
import sketchSvg from '../../assets/icons/drive/sketch.svg';
import txtSvg from '../../assets/icons/drive/txt.svg';
import videoSvg from '../../assets/icons/drive/video.svg';
import wordSvg from '../../assets/icons/drive/word.svg';
import zipSvg from '../../assets/icons/drive/zip.svg';

interface IconLibrary {
  id: string;
  iconSrc: string;
  extensions: string[];
}

const FILE_TYPE_MAP: IconLibrary[] = [
  {
    id: 'pdf',
    iconSrc: pdfSvg,
    extensions: ['pdf'],
  },
  {
    id: 'excel',
    iconSrc: excelSvg,
    extensions: ['xlsx', 'xlsm', 'xlsb', 'xltx', 'xltm', 'xls', 'xlt', 'xlam', 'xla', 'xlw', 'xlr'],
  },
  {
    id: 'csv',
    iconSrc: csvSvg,
    extensions: ['csv'],
  },
  {
    id: 'word',
    iconSrc: wordSvg,
    extensions: ['doc', 'docx'],
  },
  {
    id: 'powerpoint',
    iconSrc: powerpointSvg,
    extensions: ['pptx', 'pptm'],
  },
  {
    id: 'ppt',
    iconSrc: pptSvg,
    extensions: ['ppt'],
  },
  {
    id: 'image',
    iconSrc: imageSvg,
    extensions: ['tif', 'tiff', 'bmp', 'heic', 'jpg', 'jpeg', 'gif', 'png', 'eps', 'raw', 'cr2', 'nef', 'orf', 'sr2', 'webp', 'svg'],
  },
  {
    id: 'video',
    iconSrc: videoSvg,
    extensions: [
      'webm', 'mkv', 'vob', 'ogg', 'drc', 'avi', 'mts', 'm2ts', 'mov', 'qt',
      'wmv', 'yuv', 'rm', 'rmvb', 'viv', 'asf', 'amv', 'mp4', 'm4p', 'mpg',
      'mp2', 'mpeg', 'mpe', 'mpv', 'm2v', 'm4v', 'svi', '3gp', '3g2', 'mxf',
      'roq', 'msv', 'flv', 'f4v', 'f4p', 'f4a', 'f4b'
    ],
  },
  {
    id: 'audio',
    iconSrc: audioSvg,
    extensions: [
      '3gp', 'aa', 'aac', 'aax', 'act', 'aiff', 'alac', 'amr', 'ape', 'au',
      'awd', 'dss', 'dvf', 'flac', 'gsm', 'iklax', 'ivs', 'm4a', 'm4b', 'm4p',
      'mmf', 'mp3', 'mpc', 'msv', 'nmf', 'ogg', 'oga', 'mogg', 'opus', 'ra',
      'rm', 'rf64', 'sln', 'tta', 'voc', 'vox', 'wav', 'wma', 'wv', 'webm',
      '8svx', 'cda'
    ],
  },
  {
    id: 'zip',
    iconSrc: zipSvg,
    extensions: ['zip', 'zipx', 'rar', '7z', 'deb', 'pkg', 'tar.gz', 'tar', 'gz', 'z', 'arj', 'rpm'],
  },
  {
    id: 'code',
    iconSrc: codeSvg,
    extensions: [
      'c', 'h', 'cpp', 'c++', 'cc', 'cxx', 'hpp', 'h++', 'hh', 'hxx',
      'cob', 'cpy', 'cs', 'cmake', 'coffee', 'css', 'less', 'sass', 'scss',
      'f', 'for', 'f77', 'f90', 'aspx', 'html', 'hmn', 'java', 'jsp', 'js',
      'ts', 'json', 'jsx', 'tsx', 'kt', 'm', 'nb', 'php', 'php3', 'php4',
      'php5', 'phtml', 'build', 'bzl', 'py', 'pyw', 'rb', 'sql', 'vue',
      'yaml', 'yml'
    ],
  },
  {
    id: 'txt',
    iconSrc: txtSvg,
    extensions: ['txt', 'text', 'conf', 'def', 'list', 'log', 'md', 'lock'],
  },
  {
    id: 'figma',
    iconSrc: figmaSvg,
    extensions: ['fig'],
  },
  {
    id: 'sketch',
    iconSrc: sketchSvg,
    extensions: ['sketch'],
  },
  {
    id: 'photoshop',
    iconSrc: photoshopSvg,
    extensions: ['psd'],
  },
  {
    id: 'illustrator',
    iconSrc: illustratorSvg,
    extensions: ['ai'],
  },
  {
    id: 'indesign',
    iconSrc: indesignSvg,
    extensions: ['indd', 'indl', 'indb', 'indt', 'inx', 'idml'],
  },
  {
    id: 'folder',
    iconSrc: folderSvg,
    extensions: ['folder'],
  },
];

export function extractExtension(nameOrPath?: string): string {
  if (!nameOrPath) return '';
  const clean = nameOrPath.split('?')[0].split('#')[0];
  const parts = clean.split('.');
  if (parts.length <= 1) return '';
  return parts[parts.length - 1].toLowerCase();
}

export function getFileIconSrc(extensionOrName?: string, mimeType?: string): string {
  const ext = extractExtension(extensionOrName) || (extensionOrName || '').toLowerCase();
  
  // Direct extension match
  const matched = FILE_TYPE_MAP.find((item) => item.extensions.includes(ext));
  if (matched) return matched.iconSrc;

  // Secondary MIME type heuristic
  if (mimeType) {
    const lowerMime = mimeType.toLowerCase();
    if (lowerMime.includes('pdf')) return pdfSvg;
    if (lowerMime.includes('image/')) return imageSvg;
    if (lowerMime.includes('audio/')) return audioSvg;
    if (lowerMime.includes('video/')) return videoSvg;
    if (lowerMime.includes('spreadsheet') || lowerMime.includes('excel') || lowerMime.includes('csv')) return excelSvg;
    if (lowerMime.includes('word') || lowerMime.includes('document')) return wordSvg;
    if (lowerMime.includes('presentation') || lowerMime.includes('powerpoint')) return powerpointSvg;
    if (lowerMime.includes('zip') || lowerMime.includes('compressed') || lowerMime.includes('tar')) return zipSvg;
    if (lowerMime.includes('text/')) return txtSvg;
    if (lowerMime.includes('json') || lowerMime.includes('javascript') || lowerMime.includes('typescript')) return codeSvg;
  }

  return defaultSvg;
}

export interface InternxtFileIconProps {
  name?: string;
  extension?: string;
  mimeType?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  alt?: string;
}

export const InternxtFileIcon: React.FC<InternxtFileIconProps> = ({
  name,
  extension,
  mimeType,
  className = '',
  size = 'md',
  alt,
}) => {
  const iconSrc = getFileIconSrc(extension || name, mimeType);

  const sizeClasses: Record<string, string> = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16 sm:w-20 sm:h-20',
    '2xl': 'w-24 h-24 sm:w-28 sm:h-28',
  };

  const chosenSize = sizeClasses[size] || sizeClasses.md;

  return (
    <img
      src={iconSrc}
      alt={alt || name || 'File'}
      className={`shrink-0 select-none pointer-events-none object-contain ${chosenSize} ${className}`}
      loading="lazy"
      draggable={false}
    />
  );
};
