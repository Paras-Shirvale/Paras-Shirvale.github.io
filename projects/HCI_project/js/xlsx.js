/* ============================================================
   xlsx.js - an Excel workbook with one tab per kind of data.

   A CSV file is one table and cannot hold tabs, so "everything in one
   file, a tab for each type" has to be an Excel workbook (.xlsx). It
   opens in Excel, Google Sheets, LibreOffice and Numbers.

   No library: an .xlsx is a zip of a few small XML files. The zip is
   written with no compression ("stored"), which every reader accepts.

     makeXlsx([{ name: 'sessions', rows: [ {col: value, ...}, ... ] }, ...])
       -> Uint8Array of the .xlsx file
   ============================================================ */

(function (root) {
  'use strict';

  /* ── CRC-32, which the zip format needs ── */
  var TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(str) { return new TextEncoder().encode(str); }

  function zip(files) {                      /* files: [{ name, data: Uint8Array }] */
    var parts = [], central = [], offset = 0;
    function u16(v) { return [v & 255, (v >>> 8) & 255]; }
    function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = utf8(f.name), crc = crc32(f.data), size = f.data.length;
      var local = [0x50, 0x4B, 0x03, 0x04].concat(u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
        u32(crc), u32(size), u32(size), u16(name.length), u16(0));
      parts.push(new Uint8Array(local), name, f.data);
      central.push({ name: name, crc: crc, size: size, offset: offset });
      offset += local.length + name.length + size;
    });
    var cdStart = offset, cdSize = 0;
    central.forEach(function (c) {
      var rec = [0x50, 0x4B, 0x01, 0x02].concat(u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
        u32(c.crc), u32(c.size), u32(c.size), u16(c.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.offset));
      parts.push(new Uint8Array(rec), c.name);
      cdSize += rec.length + c.name.length;
    });
    parts.push(new Uint8Array([0x50, 0x4B, 0x05, 0x06].concat(u16(0), u16(0), u16(files.length), u16(files.length),
      u32(cdSize), u32(cdStart), u16(0))));
    var total = parts.reduce(function (n, p) { return n + p.length; }, 0), out = new Uint8Array(total), at = 0;
    parts.forEach(function (p) { out.set(p, at); at += p.length; });
    return out;
  }

  /* ── the XML ── */
  function esc(s) {
    return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function colName(i) {                      /* 0 -> A, 26 -> AA */
    var s = '';
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s;
    return s;
  }
  function cell(ref, v, style) {
    var st = style ? ' s="1"' : '';
    if (v == null || v === '') return '';
    if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
    if (typeof v === 'boolean') return '<c r="' + ref + '" t="b"' + st + '><v>' + (v ? 1 : 0) + '</v></c>';
    if (typeof v === 'object') v = JSON.stringify(v);
    return '<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
  }
  function sheetXml(rows) {
    var cols = [];
    rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<cols>' + cols.map(function (c, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + Math.min(40, Math.max(10, c.length + 3)) + '" customWidth="1"/>'; }).join('') + '</cols>' +
      '<sheetData>';
    if (cols.length) {
      xml += '<row r="1">' + cols.map(function (c, i) { return cell(colName(i) + '1', c, true); }).join('') + '</row>';
      rows.forEach(function (r, n) {
        xml += '<row r="' + (n + 2) + '">' + cols.map(function (c, i) { return cell(colName(i) + (n + 2), r[c]); }).join('') + '</row>';
      });
    }
    return xml + '</sheetData></worksheet>';
  }
  function sheetName(n, used) {              /* Excel: 31 characters, none of []:*?/\ */
    var s = String(n).replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 31) || 'Sheet';
    var base = s, i = 2;
    while (used[s.toLowerCase()]) s = base.slice(0, 28) + ' ' + (i++);
    used[s.toLowerCase()] = 1;
    return s;
  }

  function makeXlsx(sheets) {
    if (!sheets.length) sheets = [{ name: 'Empty', rows: [] }];
    var used = {}, names = sheets.map(function (s) { return sheetName(s.name, used); });
    var files = [
      { name: '[Content_Types].xml', data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') +
        '</Types>') },
      { name: '_rels/.rels', data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>') },
      { name: 'xl/workbook.xml', data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets>' + names.map(function (n, i) { return '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>') },
      { name: 'xl/_rels/workbook.xml.rels', data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
        '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>') },
      { name: 'xl/styles.xml', data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
        '</styleSheet>') }
    ];
    sheets.forEach(function (s, i) { files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: utf8(sheetXml(s.rows || [])) }); });
    return zip(files);
  }

  var api = { makeXlsx: makeXlsx, crc32: crc32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SparkXlsx = api;
})(typeof window !== 'undefined' ? window : globalThis);
