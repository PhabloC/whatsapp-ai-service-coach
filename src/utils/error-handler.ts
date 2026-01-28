/**
 * Utilitário para tratamento padronizado de erros
 */

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Exibe erro de forma consistente
 * Em produção, pode ser integrado com um sistema de notificações
 */
export const handleError = (error: unknown, context?: string): ErrorInfo => {
  let errorInfo: ErrorInfo;

  if (error instanceof Error) {
    errorInfo = {
      message: error.message,
      code: (error as any).code,
      details: error.stack,
    };
  } else if (typeof error === "string") {
    errorInfo = {
      message: error,
    };
  } else if (error && typeof error === "object" && "message" in error) {
    errorInfo = {
      message: String((error as any).message),
      code: (error as any).code,
      details: error,
    };
  } else {
    errorInfo = {
      message: "Erro desconhecido",
      details: error,
    };
  }

  // Log do erro no console (apenas em desenvolvimento)
  if (import.meta.env.DEV) {
    console.error(`[${context || "Erro"}]`, errorInfo);
  }

  // Em produção, aqui poderia enviar para um serviço de monitoramento
  // Ex: Sentry, LogRocket, etc.

  return errorInfo;
};

/**
 * Exibe erro ao usuário de forma amigável
 */
export const showErrorToUser = (error: unknown, context?: string): void => {
  const errorInfo = handleError(error, context);

  // Por enquanto usa alert, mas pode ser substituído por um sistema de notificações
  // Ex: react-toastify, react-hot-toast, etc.
  alert(`${context ? `${context}: ` : ""}${errorInfo.message}`);
};

/**
 * Trata erro de API (fetch, axios, etc)
 */
export const handleApiError = async (
  response: Response,
): Promise<ErrorInfo> => {
  let errorInfo: ErrorInfo;

  try {
    const data = await response.json();
    errorInfo = {
      message:
        data.error ||
        data.message ||
        `Erro ${response.status}: ${response.statusText}`,
      code: String(response.status),
      details: data,
    };
  } catch {
    errorInfo = {
      message: `Erro ${response.status}: ${response.statusText}`,
      code: String(response.status),
    };
  }

  return errorInfo;
};
