declare module 'compressjs' {
    const compressjs: any;
    export default compressjs;
}

declare module 'lz4js' {
    export const compress: any;
    export const decompress: any;
    export const compressFrame: any;
    export const decompressFrame: any;
}
