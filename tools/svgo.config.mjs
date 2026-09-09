export default {
  multipass: true,
  js2svg: { indent: 2, pretty: true },
  plugins: [
    { name: 'preset-default',
      params: { overrides: {
        cleanupIds: false,       // os paths sao nomeados de proposito
        removeViewBox: false,
        removeTitle: false,
        convertPathData: {
          floatPrecision: 1,
          forceAbsolutePath: true,   // legivel para edicao manual
          utilizeAbsolute: true,
        },
      } } },
  ],
};
