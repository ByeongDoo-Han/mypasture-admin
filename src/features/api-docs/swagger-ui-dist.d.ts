declare module 'swagger-ui-dist/swagger-ui-bundle.js' {
  type SwaggerUiInstance = { destroy?: () => void };
  const SwaggerUIBundle: (options: {
    domNode: HTMLElement;
    spec: Record<string, unknown>;
    supportedSubmitMethods: string[];
    docExpansion: 'none' | 'list' | 'full';
  }) => SwaggerUiInstance;
  export default SwaggerUIBundle;
}
