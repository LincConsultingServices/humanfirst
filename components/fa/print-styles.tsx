// Print rules: only the #fa-print area is printed (header, footer and the chat widget are hidden).
export function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { margin: 14mm; }
        html, body { background: #fff !important; }
        body * { visibility: hidden !important; }
        #fa-print, #fa-print * { visibility: visible !important; }
        #fa-print { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
        .break-inside-avoid { break-inside: avoid; }
      }
    `}</style>
  )
}
