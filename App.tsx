import React, { useState, useEffect } from "react";
import { QRCodeScanner } from "./components/qr-code-scanner/QRCodeScanner";
import {
  ChatSession,
  AnalysisEntry,
  Message,
  CriteriaConfig,
  HeatmapAnalysis,
  SalesScript,
} from "./types";
import { ChatWindow } from "./components/chat-window/ChatWindow";
import { ConnectionInstance } from "./components/sidebar/types";
import { Dashboard } from "./components/dashboard/Dashboard";
import { LoadingScreen } from "./components/loading";
import { MainLayout } from "./components/layout";
import { whatsappAPI } from "./src/services/whatsapp-api";
import { Login } from "./pages/login";
import { Register } from "./pages/register";
import { ResetPassword } from "./pages/reset-password";
import { NewPassword } from "./pages/new-password";
import { WelcomeScreen } from "./pages/welcome";
import { useAuth } from "./src/hooks/useAuth";

type AuthPage = "login" | "register" | "reset";

// Constantes para localStorage
const STORAGE_KEY_SESSIONS = "whatsapp_coach_sessions";
const STORAGE_KEY_CRITERIA = "whatsapp_coach_criteria";

// Limite de conversas para exibir na interface (melhora performance)
// Exibe apenas as N conversas mais recentes
const MAX_DISPLAYED_CONVERSATIONS = 50;

// Funções utilitárias para persistência
const loadSessionsFromStorage = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
    console.log(
      "📦 Carregando sessões do localStorage:",
      stored ? "encontrado" : "vazio",
    );
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validar estrutura básica
      if (Array.isArray(parsed)) {
        // FILTRO CRÍTICO: Remover grupos imediatamente ao carregar
        const withoutGroups = parsed.filter((session: ChatSession) => {
          const isGroup =
            session.contactJid?.includes("@g.us") ||
            session.id?.includes("@g.us");
          if (isGroup) {
            console.log("🧹 Removendo grupo do localStorage:", session.id);
            return false;
          }
          return true;
        });

        // Se grupos foram removidos, salvar de volta imediatamente
        if (withoutGroups.length !== parsed.length) {
          localStorage.setItem(
            STORAGE_KEY_SESSIONS,
            JSON.stringify(withoutGroups),
          );
          console.log(
            `🧹 ${parsed.length - withoutGroups.length} grupo(s) removido(s) do localStorage`,
          );
        }

        console.log(
          `📦 ${withoutGroups.length} sessões carregadas do localStorage`,
        );
        return withoutGroups;
      }
    }
  } catch (error) {
    console.error("Erro ao carregar sessões do localStorage:", error);
  }
  return [];
};

const saveSessionsToStorage = (sessions: ChatSession[]) => {
  try {
    // Filtrar sessões inválidas antes de salvar
    const validSessions = sessions
      .filter((session) => {
        // Remover sessões de status e outras inválidas
        if (session.contactJid?.includes("status@broadcast")) return false;
        if (session.id?.includes("status@broadcast")) return false;
        // FILTRO: Remover conversas de grupo
        if (session.contactJid?.includes("@g.us")) return false;
        if (session.id?.includes("@g.us")) return false;
        if (!session.contactJid || !session.id) return false;
        return true;
      })
      .filter(
        (session, idx, arr) =>
          // Remover duplicatas por ID
          arr.findIndex((s) => s.id === session.id) === idx,
      );

    // Limitar quantidade de mensagens por sessão para não estourar o localStorage
    // Reduzido para 100 mensagens por sessão para evitar problemas de quota
    const sessionsToStore = validSessions.map((session) => ({
      ...session,
      messages: session.messages.slice(-100), // Manter últimas 100 mensagens por conversa
    }));
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessionsToStore));
    console.log(
      `💾 ${sessionsToStore.length} sessões válidas salvas no localStorage (${sessions.length - sessionsToStore.length} filtradas)`,
    );
  } catch (error) {
    console.error("Erro ao salvar sessões no localStorage:", error);
    // Se der erro de quota, tentar salvar com menos mensagens
    try {
      const validSessions = sessions
        .filter((session) => {
          if (session.contactJid?.includes("status@broadcast")) return false;
          if (session.id?.includes("status@broadcast")) return false;
          // FILTRO: Remover conversas de grupo
          if (session.contactJid?.includes("@g.us")) return false;
          if (session.id?.includes("@g.us")) return false;
          if (!session.contactJid || !session.id) return false;
          return true;
        })
        .filter(
          (session, idx, arr) =>
            arr.findIndex((s) => s.id === session.id) === idx,
        );

      // Redução ainda mais agressiva em caso de erro de quota
      const minimalSessions = validSessions.map((session) => ({
        ...session,
        messages: session.messages.slice(-50), // Apenas últimas 50 mensagens
        analysisHistory: session.analysisHistory.slice(-5), // Apenas últimas 5 análises
        heatmapHistory: session.heatmapHistory?.slice(-3), // Apenas últimos 3 heatmaps
        salesScriptHistory: session.salesScriptHistory?.slice(-3), // Apenas últimos 3 scripts
      }));
      localStorage.setItem(
        STORAGE_KEY_SESSIONS,
        JSON.stringify(minimalSessions),
      );
    } catch {
      console.error(
        "Não foi possível salvar sessões mesmo com dados reduzidos",
      );
    }
  }
};

const loadCriteriaFromStorage = (): Map<string, CriteriaConfig> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CRITERIA);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error("Erro ao carregar critérios do localStorage:", error);
  }
  return new Map();
};

const saveCriteriaToStorage = (criteria: Map<string, CriteriaConfig>) => {
  try {
    const obj = Object.fromEntries(criteria);
    localStorage.setItem(STORAGE_KEY_CRITERIA, JSON.stringify(obj));
  } catch (error) {
    console.error("Erro ao salvar critérios no localStorage:", error);
  }
};

const App: React.FC = () => {
  const {
    user,
    loading: authLoading,
    error: authError,
    isRecoveryMode,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
    clearRecoveryMode,
  } = useAuth();
  const [authPage, setAuthPage] = useState<AuthPage>("login");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connections, setConnections] = useState<ConnectionInstance[]>([]);
  const [currentView, setCurrentView] = useState<
    "chats" | "dashboard" | "settings"
  >("chats");
  const [instanceCriteria, setInstanceCriteria] = useState<
    Map<string, CriteriaConfig>
  >(new Map());

  // Estado para controlar carregamento inicial das conexões
  const [loadingConnections, setLoadingConnections] = useState(true);
  // Flag para indicar se já carregou do localStorage
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // Carregar sessões do localStorage quando o user logar
  useEffect(() => {
    if (user && !hasLoadedFromStorage) {
      const storedSessions = loadSessionsFromStorage();
      const storedCriteria = loadCriteriaFromStorage();

      if (storedSessions.length > 0) {
        // Filtrar sessões inválidas (status@broadcast, grupos, etc) e remover duplicatas
        const validSessions = storedSessions
          .filter((session) => {
            // Remover sessões de status e outras inválidas
            if (session.contactJid?.includes("status@broadcast")) return false;
            if (session.id?.includes("status@broadcast")) return false;
            // FILTRO: Remover conversas de grupo
            const isGroup =
              session.contactJid?.includes("@g.us") ||
              session.id?.includes("@g.us");
            if (isGroup) {
              // #region agent log
              fetch(
                "http://127.0.0.1:7244/ingest/4c588078-cb72-4b05-91b7-3d96536f9ac0",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    location: "App.tsx:186",
                    message: "GRUPO REMOVIDO do localStorage",
                    data: {
                      sessionId: session.id,
                      contactJid: session.contactJid,
                    },
                    timestamp: Date.now(),
                    sessionId: "debug-session",
                    runId: "run1",
                    hypothesisId: "C",
                  }),
                },
              ).catch(() => {});
              // #endregion
              return false;
            }
            if (!session.contactJid || !session.id) return false;
            return true;
          })
          .filter(
            (session, idx, arr) =>
              // Remover duplicatas por ID
              arr.findIndex((s) => s.id === session.id) === idx,
          )
          .sort((a, b) => {
            // Ordenar por última mensagem (mais recente primeiro)
            const aTime = a.lastMessageTimestamp || 0;
            const bTime = b.lastMessageTimestamp || 0;
            return bTime - aTime;
          });

        const filteredCount = storedSessions.length - validSessions.length;
        console.log(
          `📦 Restaurando ${validSessions.length} sessões válidas do localStorage (${filteredCount} filtradas)`,
        );

        // Se grupos foram filtrados, salvar de volta sem grupos para limpar o localStorage
        if (filteredCount > 0) {
          console.log(`🧹 Removendo ${filteredCount} grupo(s) do localStorage`);
          saveSessionsToStorage(validSessions);
        }

        setSessions(validSessions);
      }

      if (storedCriteria.size > 0) {
        setInstanceCriteria(storedCriteria);
      }

      setHasLoadedFromStorage(true);
    }
  }, [user, hasLoadedFromStorage]);

  // Persistir sessões no localStorage quando mudarem (com debounce)
  useEffect(() => {
    // Só salvar após o carregamento inicial ter sido feito
    if (!hasLoadedFromStorage) return;

    const timeoutId = setTimeout(() => {
      saveSessionsToStorage(sessions);
    }, 1000); // Debounce de 1 segundo para evitar escritas excessivas

    return () => clearTimeout(timeoutId);
  }, [sessions, hasLoadedFromStorage]);

  // Persistir critérios no localStorage quando mudarem
  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    saveCriteriaToStorage(instanceCriteria);
  }, [instanceCriteria, hasLoadedFromStorage]);

  // Conectar WebSocket e carregar instâncias ao fazer login
  useEffect(() => {
    if (!user) return;

    console.log("🔄 useEffect de conexões iniciado - user:", user.email);

    const initializeConnections = async () => {
      setLoadingConnections(true);
      try {
        console.log("🔌 Conectando WebSocket...");
        whatsappAPI.connect();

        // Tentar restaurar sessão automaticamente
        const restoredInstance = await whatsappAPI.autoRestoreSession();

        if (restoredInstance) {
          console.log(
            "✅ Sessão restaurada automaticamente:",
            restoredInstance.id,
          );
        }

        // Carregar todas as instâncias (incluindo a restaurada)
        const instances = await loadInstances();
        console.log("📱 Instâncias carregadas:", instances.length);
      } catch (error) {
        console.error("Erro ao inicializar conexões:", error);
      } finally {
        setLoadingConnections(false);
      }
    };

    initializeConnections();

    const handleMessage = (data: { instanceId: string; message: any }) => {
      console.log("📨 App.tsx recebeu mensagem:", data);
      const { instanceId, message } = data;
      const contactName = message.contactName || message.from.split("@")[0];
      const isFromMe = message.isFromMe || false;
      const sender: "client" | "agent" = isFromMe ? "agent" : "client";
      const clientJid = isFromMe ? message.to : message.from;

      // Ignorar mensagens de status e outras inválidas
      if (clientJid?.includes("status@broadcast") || !clientJid) {
        return;
      }

      // FILTRO: Ignorar mensagens de grupo (não exibir conversas de grupo)
      // Verificar tanto 'from' quanto 'to' para garantir que grupos sejam filtrados
      const fromJid = message.from || "";
      const toJid = message.to || "";

      // #region agent log
      fetch(
        "http://127.0.0.1:7244/ingest/4c588078-cb72-4b05-91b7-3d96536f9ac0",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "App.tsx:285",
            message: "Verificando grupo no frontend",
            data: {
              clientJid,
              fromJid,
              toJid,
              isGroup:
                clientJid?.includes("@g.us") ||
                fromJid.includes("@g.us") ||
                toJid.includes("@g.us"),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "B",
          }),
        },
      ).catch(() => {});
      // #endregion

      if (
        clientJid?.includes("@g.us") ||
        fromJid.includes("@g.us") ||
        toJid.includes("@g.us")
      ) {
        console.log("Ignorando mensagem de grupo:", {
          clientJid,
          fromJid,
          toJid,
        });
        // #region agent log
        fetch(
          "http://127.0.0.1:7244/ingest/4c588078-cb72-4b05-91b7-3d96536f9ac0",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "App.tsx:293",
              message: "GRUPO FILTRADO no frontend",
              data: { clientJid, fromJid, toJid },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "B",
            }),
          },
        ).catch(() => {});
        // #endregion
        return;
      }

      // #region agent log
      fetch(
        "http://127.0.0.1:7244/ingest/4c588078-cb72-4b05-91b7-3d96536f9ac0",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "App.tsx:299",
            message: "Mensagem aceita no frontend - não é grupo",
            data: { clientJid, fromJid, toJid },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "B",
          }),
        },
      ).catch(() => {});
      // #endregion

      const sessionId = `${instanceId}-${clientJid}`;
      const messageTimestamp = message.timestamp; // timestamp em milissegundos
      const isHistorical = message.isHistorical || false;
      console.log(
        `📨 Processando mensagem para sessão ${sessionId}:`,
        message.body?.substring(0, 50),
      );

      setSessions((prev) => {
        // Verificar duplicatas antes de processar
        const duplicateIds = prev
          .filter((s, idx) => prev.findIndex((p) => p.id === s.id) !== idx)
          .map((s) => s.id);

        let session = prev.find((s) => s.id === sessionId);

        // Criar nova mensagem
        const newMessage: Message = {
          id: message.id,
          sender: sender,
          text: message.body,
          timestamp: new Date(messageTimestamp).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          contactName: contactName,
          rawTimestamp: messageTimestamp, // Guardar timestamp original para ordenação
        };

        if (!session) {
          // VERIFICAÇÃO FINAL: Garantir que não estamos criando sessão para grupo
          // Mesmo que tenha passado pelos filtros anteriores, verificar novamente aqui
          if (clientJid?.includes("@g.us") || sessionId.includes("@g.us")) {
            console.log("⚠️ Tentativa de criar sessão para grupo bloqueada:", {
              clientJid,
              sessionId,
            });
            // #region agent log
            fetch(
              "http://127.0.0.1:7244/ingest/4c588078-cb72-4b05-91b7-3d96536f9ac0",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  location: "App.tsx:308",
                  message: "BLOQUEIO: Tentativa de criar sessão de grupo",
                  data: { clientJid, sessionId },
                  timestamp: Date.now(),
                  sessionId: "debug-session",
                  runId: "run1",
                  hypothesisId: "D",
                }),
              },
            ).catch(() => {});
            // #endregion
            return prev; // Não criar sessão para grupo
          }

          let instanceCriteriaConfig: CriteriaConfig | undefined;
          for (const [instId, criteria] of instanceCriteria.entries()) {
            if (sessionId.startsWith(instId + "-")) {
              instanceCriteriaConfig = criteria;
              break;
            }
          }

          // Criar sessão com a primeira mensagem
          session = {
            id: sessionId,
            contactName: contactName,
            lastMessage: message.body,
            timestamp: new Date(messageTimestamp).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            lastMessageTimestamp: messageTimestamp,
            messages: [newMessage],
            analysisHistory: [],
            criteriaConfig: instanceCriteriaConfig,
            contactJid: clientJid,
            profilePicture: undefined,
          };

          // Buscar foto de perfil assincronamente
          whatsappAPI
            .getProfilePicture(instanceId, clientJid)
            .then((profilePic) => {
              if (profilePic) {
                setSessions((prevSessions) =>
                  prevSessions.map((s) =>
                    s.id === sessionId
                      ? { ...s, profilePicture: profilePic }
                      : s,
                  ),
                );
              }
            })
            .catch((err) =>
              console.error("Erro ao buscar foto de perfil:", err),
            );

          // Verificar se já existe sessão com mesmo ID antes de adicionar
          const existingSession = prev.find((s) => s.id === sessionId);

          if (existingSession) {
            return prev; // Não adicionar duplicata
          }

          // Adicionar nova sessão e ordenar por última mensagem (mais recente primeiro)
          const updatedSessions = [...prev, session].sort((a, b) => {
            const aTime = a.lastMessageTimestamp || 0;
            const bTime = b.lastMessageTimestamp || 0;
            return bTime - aTime; // Ordem decrescente (mais recente primeiro)
          });

          return updatedSessions;
        }

        // Verificar se mensagem já existe
        const messageExists = session.messages.some((m) => m.id === message.id);
        if (messageExists) return prev;

        // Atualizar sessão existente
        const updatedSessions = prev.map((s) => {
          if (s.id === sessionId) {
            // Adicionar mensagem e ordenar por timestamp
            const updatedMessages = [...s.messages, newMessage].sort((a, b) => {
              const aTime = a.rawTimestamp || 0;
              const bTime = b.rawTimestamp || 0;
              return aTime - bTime;
            });

            // Encontrar a mensagem mais recente para atualizar lastMessage
            const latestMessage = updatedMessages[updatedMessages.length - 1];
            const latestTimestamp =
              latestMessage.rawTimestamp || messageTimestamp;

            // Atualizar nome do contato se recebemos um nome melhor (não numérico)
            const currentNameIsNumeric = /^\+?\d[\d\s\-()]+$/.test(
              s.contactName,
            );
            const newNameIsNumeric = /^\+?\d[\d\s\-()]+$/.test(contactName);
            const shouldUpdateName = currentNameIsNumeric && !newNameIsNumeric;

            return {
              ...s,
              messages: updatedMessages,
              lastMessage: latestMessage.text,
              timestamp: new Date(latestTimestamp).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              lastMessageTimestamp: latestTimestamp,
              ...(shouldUpdateName && { contactName: contactName }),
            };
          }
          return s;
        });

        // Remover duplicatas antes de ordenar
        const uniqueSessions = updatedSessions.filter(
          (s, idx, arr) => arr.findIndex((sess) => sess.id === s.id) === idx,
        );

        // Ordenar sessões por última mensagem (mais recente primeiro)
        const sortedSessions = uniqueSessions.sort((a, b) => {
          const aTime = a.lastMessageTimestamp || 0;
          const bTime = b.lastMessageTimestamp || 0;
          return bTime - aTime;
        });

        return sortedSessions;
      });
    };

    const handleInstanceConnected = () => loadInstances();
    const handleInstanceDisconnected = () => loadInstances();

    whatsappAPI.on("message", handleMessage);
    whatsappAPI.on("instance_connected", handleInstanceConnected);
    whatsappAPI.on("instance_disconnected", handleInstanceDisconnected);

    return () => {
      whatsappAPI.off("message", handleMessage);
      whatsappAPI.off("instance_connected", handleInstanceConnected);
      whatsappAPI.off("instance_disconnected", handleInstanceDisconnected);
    };
  }, [user, instanceCriteria]);

  // Aplicar critérios da instância quando atualizados
  useEffect(() => {
    if (instanceCriteria.size === 0) return;

    setSessions((prev) => {
      let hasChanges = false;
      const updated = prev.map((session) => {
        if (!session.criteriaConfig) {
          for (const [instanceId, criteria] of instanceCriteria.entries()) {
            if (session.id.startsWith(instanceId + "-")) {
              hasChanges = true;
              return { ...session, criteriaConfig: criteria };
            }
          }
        }
        return session;
      });
      return hasChanges ? updated : prev;
    });
  }, [instanceCriteria]);

  const loadInstances = async (): Promise<ConnectionInstance[]> => {
    try {
      const instances = await whatsappAPI.getInstances();
      const connectionInstances: ConnectionInstance[] = instances.map(
        (inst) => ({
          id: inst.id,
          name: inst.name,
          status:
            inst.status === "connected"
              ? "active"
              : inst.status === "connecting" || inst.status === "qr_ready"
                ? "connecting"
                : "inactive",
          connectedAt: inst.connectedAt
            ? new Date(inst.connectedAt).toLocaleString("pt-BR")
            : undefined,
          phoneNumber: inst.phoneNumber,
        }),
      );
      setConnections(connectionInstances);
      setIsConnected(connectionInstances.some((c) => c.status === "active"));
      return connectionInstances;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao carregar instâncias:", error);
      }
      return [];
    }
  };

  const handleLogout = async () => {
    // Limpar dados locais ao fazer logout (segurança entre usuários)
    localStorage.removeItem(STORAGE_KEY_SESSIONS);
    localStorage.removeItem(STORAGE_KEY_CRITERIA);
    setSessions([]);
    setInstanceCriteria(new Map());
    setConnections([]);
    setIsConnected(false);
    setHasLoadedFromStorage(false);
    await signOut();
  };

  const handleConnectWhatsApp = async () => {
    try {
      await loadInstances();
      setIsConnected(true);
      setShowQRScanner(false);
    } catch (error) {
      console.error("Erro ao conectar:", error);
    }
  };

  const handleAddConnection = () => {
    setShowQRScanner(true);
  };

  const handleDisconnectInstance = async (id: string) => {
    try {
      setSessions((prev) => prev.filter((s) => !s.id.startsWith(id + "-")));
      setConnections((prev) => prev.filter((c) => c.id !== id));

      await whatsappAPI.deleteInstance(id);

      const updatedConnections = await loadInstances();
      const remainingConnections = updatedConnections.filter(
        (c) => c.id !== id,
      );

      if (
        remainingConnections.length === 0 ||
        !remainingConnections.some((c) => c.status === "active")
      ) {
        setIsConnected(false);
      }

      if (activeSessionId && activeSessionId.startsWith(id + "-")) {
        setActiveSessionId(null);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao remover instância:", error);
      }
      await loadInstances();
      alert("Erro ao remover conexão. Tente novamente.");
    }
  };

  const updateSessionPrompt = (sessionId: string, newPrompt: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, customPrompt: newPrompt } : s,
      ),
    );
  };

  const updateSessionCriteria = (
    sessionId: string,
    criteria: CriteriaConfig,
    generatedPrompt?: string,
  ) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              criteriaConfig: criteria,
              // Se tiver prompt gerado, atualizar o customPrompt da sessão
              customPrompt: generatedPrompt || s.customPrompt,
            }
          : s,
      ),
    );
  };

  const updateInstanceCriteria = (
    instanceId: string,
    criteria: CriteriaConfig,
  ) => {
    setInstanceCriteria((prev) => {
      const newMap = new Map(prev);
      newMap.set(instanceId, criteria);
      return newMap;
    });

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id.startsWith(instanceId + "-")) {
          return { ...s, criteriaConfig: criteria };
        }
        return s;
      }),
    );
  };

  const handleSaveHeatmapAnalysis = (
    sessionId: string,
    heatmap: HeatmapAnalysis,
  ) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const newHeatmapHistory = s.heatmapHistory || [];
          return {
            ...s,
            heatmapHistory: [
              {
                id: Date.now().toString(),
                timestamp: new Date().toLocaleString("pt-BR"),
                analysis: heatmap,
              },
              ...newHeatmapHistory,
            ],
          };
        }
        return s;
      }),
    );
  };

  const handleSaveAnalysis = (sessionId: string, analysis: AnalysisEntry) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, analysisHistory: [analysis, ...s.analysisHistory] }
          : s,
      ),
    );
  };

  const handleInjectMessage = (sessionId: string, message: Message) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: [...s.messages, message],
            lastMessage: message.text,
            timestamp: message.timestamp,
          };
        }
        return s;
      }),
    );
  };

  const handleMarkAsSale = (sessionId: string, markedAsSale: boolean) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, markedAsSale } : s)),
    );
  };

  const handleSaveSalesScript = (sessionId: string, script: SalesScript) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const newScriptHistory = s.salesScriptHistory || [];
          return {
            ...s,
            salesScriptHistory: [
              {
                id: Date.now().toString(),
                timestamp: new Date().toLocaleString("pt-BR"),
                script,
              },
              ...newScriptHistory,
            ],
          };
        }
        return s;
      }),
    );
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Tela de carregamento inicial
  if (authLoading && !user && !isRecoveryMode) {
    return <LoadingScreen />;
  }

  // Tela de nova senha (após clicar no link do email)
  if (isRecoveryMode) {
    return (
      <NewPassword
        loading={authLoading}
        error={authError}
        onUpdatePassword={updatePassword}
        onClearError={clearError}
        onNavigateToLogin={() => {
          clearRecoveryMode();
          setAuthPage("login");
        }}
      />
    );
  }

  // Telas de autenticação
  if (!user) {
    if (authPage === "register") {
      return (
        <Register
          loading={authLoading}
          error={authError}
          onSignUp={signUp}
          onClearError={clearError}
          onNavigateToLogin={() => setAuthPage("login")}
        />
      );
    }

    if (authPage === "reset") {
      return (
        <ResetPassword
          loading={authLoading}
          error={authError}
          onResetPassword={resetPassword}
          onClearError={clearError}
          onNavigateToLogin={() => setAuthPage("login")}
        />
      );
    }

    return (
      <Login
        loading={authLoading}
        error={authError}
        onSignIn={signIn}
        onClearError={clearError}
        onNavigateToRegister={() => setAuthPage("register")}
        onNavigateToReset={() => setAuthPage("reset")}
      />
    );
  }

  // Tela de Conexão QR Code
  if (showQRScanner) {
    return (
      <QRCodeScanner
        onConnect={handleConnectWhatsApp}
        onCancel={() => setShowQRScanner(false)}
      />
    );
  }

  // Tela de carregamento enquanto verifica conexões existentes
  if (loadingConnections) {
    return <LoadingScreen />;
  }

  // Tela de boas-vindas (sem conexão)
  if (!isConnected) {
    return (
      <WelcomeScreen
        userName={user.name}
        onLogout={handleLogout}
        onConnect={handleAddConnection}
      />
    );
  }

  // Dashboard Principal
  return (
    <MainLayout
      sessions={sessions}
      activeSessionId={activeSessionId}
      onSelectSession={setActiveSessionId}
      userName={user.name}
      onLogout={handleLogout}
      onUpdateSessionPrompt={updateSessionPrompt}
      onAddConnection={handleAddConnection}
      connections={connections}
      onDisconnectInstance={handleDisconnectInstance}
      currentView={currentView}
      onViewChange={setCurrentView}
      instanceCriteria={instanceCriteria}
      onUpdateInstanceCriteria={updateInstanceCriteria}
    >
      {currentView === "dashboard" ? (
        <Dashboard sessions={sessions} connections={connections} />
      ) : (
        <ChatWindow
          session={activeSession}
          userId={user?.id}
          onUpdateSessionPrompt={updateSessionPrompt}
          onUpdateSessionCriteria={updateSessionCriteria}
          onSaveAnalysis={handleSaveAnalysis}
          onSaveHeatmap={handleSaveHeatmapAnalysis}
          onInjectMessage={handleInjectMessage}
          onMarkAsSale={handleMarkAsSale}
          onSaveSalesScript={handleSaveSalesScript}
          instanceCriteria={instanceCriteria}
        />
      )}
    </MainLayout>
  );
};

export default App;
