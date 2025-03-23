declare module 'pdfmake/build/pdfmake' {
  const pdfMake: any;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: {
    pdfMake: {
      vfs: any;
    };
  };
  export default pdfFonts;
}

declare module 'pdfmake/interfaces' {
  export type Content = any;
  export type TDocumentDefinitions = any;
} 