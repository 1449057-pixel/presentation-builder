import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import type {
  Presentation,
  Slide,
  LibrarySlide,
  User,
  UserInvite,
  SharedUser,
  DefinitionsSlideContent,
  DragDropSlideContent,
  QuizSlideContent,
  StaticSlideContent,
} from "./src/types.ts";

const PORT = 3000;
const UNIVERSAL_ADMIN_PASSWORD = "1449057";
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface DBData {
  users: (User & { passwordHash: string })[];
  presentations: Presentation[];
  librarySlides: LibrarySlide[];
  invites: UserInvite[];
  sessions: { token: string; userId: string; createdAt: string }[];
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialDB(): DBData {
  const user1: User & { passwordHash: string } = {
    id: "user-1-lead",
    email: "hr_lead@detector.ru",
    name: "Татьяна Кацкель (HR-Lead)",
    avatarColor: "#6366f1",
    createdAt: new Date().toISOString(),
    passwordHash: "password123", // In this local/internal applet simple match
  };

  const user2: User & { passwordHash: string } = {
    id: "user-2-trainer",
    email: "trainer@detector.ru",
    name: "Алексей Соколов (Тренер)",
    avatarColor: "#10b981",
    createdAt: new Date().toISOString(),
    passwordHash: "password123",
  };

  const demoSlides: Slide[] = [
    {
      id: "slide-1",
      presentationId: "pres-demo-1",
      type: "static",
      title: "Титул: Оценка ключевых компетенций",
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: {
        title: "Геймифицированный ассессмент компетенций",
        caption:
          "Интерактивная сессия для оценки поведенческих паттернов лидеров, системного мышления и навыков разрешения конфликтов. Участники работают в микрогруппах.",
        themeStyle: "slate",
        imageUrl:
          "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
      } as StaticSlideContent,
    },
    {
      id: "slide-2",
      presentationId: "pres-demo-1",
      type: "definitions",
      title: "Определения: 4 столпа лидерства",
      order: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: {
        title: "Сформулируйте формулировку компетенций",
        instruction:
          "Командам дается 2 минуты на формулировку определений. Ведущий вносит предложения, затем нажимает «Проверить».",
        items: [
          {
            id: "def-1",
            competencyName: "Системное мышление",
            definition:
              "Умение видеть архитектуру процессов, причинно-следственные связи и долгосрочные последствия решений.",
            description:
              "Маркеры: не лечит симптомы, анализирует риски, учитывает интересы кросс-команд.",
            color: "#6366f1", // Indigo
          },
          {
            id: "def-2",
            competencyName: "Управление неопределенностью",
            definition:
              "Способность принимать взвешенные решения и структурировать хаос при дефиците вводных данных.",
            description:
              "Маркеры: формулирует гипотезы, запускает быстрые эксперименты, не впадает в ступор.",
            color: "#06b6d4", // Cyan
          },
          {
            id: "def-3",
            competencyName: "Влияние без полномочий",
            definition:
              "Убеждение стейкхолдеров через аргументы, эмоциональный интеллект и поиск win-win синергии.",
            description:
              "Маркеры: слушает возражения, не давит авторитетом, находит общие цели.",
            color: "#f59e0b", // Amber
          },
          {
            id: "def-4",
            competencyName: "Ориентация на результат",
            definition:
              "Фокус на достижении бизнес-метрик и доведение задач до измеримого финала вопреки преградам.",
            description:
              "Маркеры: доводит до конца, ставит SMART-цели, отвечает за качество и дедлайны.",
            color: "#10b981", // Emerald
          },
        ],
      } as DefinitionsSlideContent,
    },
    {
      id: "slide-3",
      presentationId: "pres-demo-1",
      type: "dragdrop",
      title: "Драг-энд-дроп: Поведенческие маркеры",
      order: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: {
        title: "Распределите высказывания кандидата по компетенциям",
        instruction:
          "Перетащите карточки в соответствующие колонки. Затем нажмите «Показать результаты».",
        competencies: [
          { id: "comp-1", name: "Системное мышление", color: "#6366f1" },
          { id: "comp-2", name: "Управление неопределенностью", color: "#06b6d4" },
          { id: "comp-3", name: "Влияние без полномочий", color: "#f59e0b" },
          { id: "comp-4", name: "Ориентация на результат", color: "#10b981" },
        ],
        questions: [
          {
            id: "q-1",
            text: "«Прежде чем фиксить баг, я проверил логи за месяц и выявил узкое место в архитектуре БД.»",
            inGame: true,
            correctCompetencyId: "comp-1",
          },
          {
            id: "q-2",
            text: "«Когда требования изменились за день до релиза, я пересобрал скоуп до MVP и согласовал план Б.»",
            inGame: true,
            correctCompetencyId: "comp-2",
          },
          {
            id: "q-3",
            text: "«Я показал финдиректору расчет потерь от простоя, и он сам выделил бюджет на рефакторинг.»",
            inGame: true,
            correctCompetencyId: "comp-3",
          },
          {
            id: "q-4",
            text: "«Мы перевыполнили квартальный план на 18% за счет автоматизации рутинных проверок.»",
            inGame: true,
            correctCompetencyId: "comp-4",
          },
          {
            id: "q-5",
            text: "«Я не ждал идеального ТЗ, а выкатил прототип на 5% пользователей для проверки метрик.»",
            inGame: true,
            correctCompetencyId: "comp-2",
          },
          {
            id: "q-6",
            text: "«Оценил, как изменение API биллинга повлияет на мобильное приложение и саппорт.»",
            inGame: true,
            correctCompetencyId: "comp-1",
          },
        ],
      } as DragDropSlideContent,
    },
    {
      id: "slide-4",
      presentationId: "pres-demo-1",
      type: "quiz",
      title: "Квиз: Кейс сложного релиза",
      order: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: {
        question:
          "Кейс: «Бизнес-заказчик требует выкатить сырую фичу к пятнице. Команда разработки предупреждает о 40% вероятности падения платежей. Ваши действия?»",
        candidateAnswer:
          "«Кандидат ответил: Я не стал спорить на эмоциях. Собрал техлида и продакта, рассчитал стоимость 1 часа простоя платежки. Предложил выкатить фичу под закрытым фиче-тогглом только для 50 бета-тестеров, а полноценный релиз провести во вторник после нагрузочного теста.»",
        criteria: [
          {
            id: "crit-1",
            text: "Оценил прямые бизнес-риски и финансовые потери",
            benchmarkMark: "yes",
          },
          {
            id: "crit-2",
            text: "Проявил партнерскую позицию и предложил компромиссный план (фиче-тоггл)",
            benchmarkMark: "yes",
          },
          {
            id: "crit-3",
            text: "Свалил вину за задержку на разработчиков перед бизнесом",
            benchmarkMark: "no",
          },
          {
            id: "crit-4",
            text: "Зафиксировал договоренности и план Б письменно в тикете",
            benchmarkMark: "partial",
          },
        ],
        comment:
          "Обратите внимание: зрелый кандидат мыслит языком ценности для бизнеса, а не обидами команды. Решение с фиче-тогглом — эталонный инженерно-продуктовый баланс.",
      } as QuizSlideContent,
    },
  ];

  const demoPresentation: Presentation = {
    id: "pres-demo-1",
    ownerId: user1.id,
    ownerEmail: user1.email,
    ownerName: user1.name,
    title: "Оценка компетенций Product & Tech лидеров",
    description: "Комплексная HR-игра с определением терминов, драг-энд-дропом и разбором кейса.",
    slides: demoSlides,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sharedWith: [
      {
        userId: user2.id,
        userEmail: user2.email,
        userName: user2.name,
        role: "edit",
        invitedAt: new Date().toISOString(),
      },
    ],
    isPublic: true,
    publicShareId: "demo-share-link",
  };

  const libraryDemo: LibrarySlide[] = [
    {
      id: "lib-1",
      ownerId: user1.id,
      ownerName: user1.name,
      type: "definitions",
      title: "Банк: Soft Skills тимлида (4 определения)",
      content: {
        title: "Определения ключевых навыков лидера команды",
        items: [
          {
            id: "lib-def-1",
            competencyName: "Делегирование",
            definition: "Передача задач с предоставлением необходимой зоны автономии и ресурсов.",
            description: "Оценивается отсутствие микроменеджмента и четкость критериев готовности.",
            color: "#8b5cf6",
          },
          {
            id: "lib-def-2",
            competencyName: "Развивающая обратная связь",
            definition: "Конструктивный фидбек по модели SBI (Situation - Behavior - Impact).",
            description: "Фокус на действиях и будущем росте, а не на личности сотрудника.",
            color: "#ec4899",
          },
          {
            id: "lib-def-3",
            competencyName: "Фасилитация встреч",
            definition: "Управление групповой динамикой для выработки совместного решения.",
            description: "Умение вовлекать молчунов и модерировать токсичные споры.",
            color: "#3b82f6",
          },
          {
            id: "lib-def-4",
            competencyName: "Эмоциональная устойчивость",
            definition: "Сохранение продуктивности и трезвой оценки в стрессовых ситуациях.",
            description: "Не поддается панике, экологично утилизирует рабочий стресс.",
            color: "#14b8a6",
          },
        ],
      } as DefinitionsSlideContent,
      tags: ["Лидерство", "Менеджмент"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "lib-2",
      ownerId: user1.id,
      ownerName: user1.name,
      type: "quiz",
      title: "Банк: Квиз по поведенческому интервью (STAR)",
      content: {
        question:
          "Вопрос кандидату: «Расскажите о случае, когда вы допустили критическую ошибку в продакшене. Как действовали?»",
        candidateAnswer:
          "«Кандидат: Ошибся в скрипте миграции, часть данных потерлась. Я сразу уведомил команду в общем канале, откатил БД из бэкапа за 25 минут, провел ретроспективу и написал чек-лист автоматического прогона миграций.»",
        criteria: [
          {
            id: "c-1",
            text: "Взял персональную ответственность без оправданий",
            benchmarkMark: "yes",
          },
          {
            id: "c-2",
            text: "Прозрачно и своевременно уведомил стейкхолдеров",
            benchmarkMark: "yes",
          },
          {
            id: "c-3",
            text: "Внедрил системное решение, чтобы ошибка не повторилась",
            benchmarkMark: "yes",
          },
          {
            id: "c-4",
            text: "Пытался скрыть инцидент или обвинить коллегу",
            benchmarkMark: "no",
          },
        ],
        comment: "Отличный ответ по фреймворку STAR с фокусом на постмортем и системные выводы.",
      } as QuizSlideContent,
      tags: ["Интервью", "Квиз"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    users: [user1, user2],
    presentations: [demoPresentation],
    librarySlides: libraryDemo,
    invites: [],
    sessions: [
      {
        token: "demo-session-token-lead",
        userId: user1.id,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function loadDB(): DBData {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading DB file, re-initializing:", err);
    const initial = getInitialDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
}

function saveDB(data: DBData): void {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

let db = loadDB();

// Helper to get authenticated user
function getAuthUser(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.headers["x-session-token"]) {
    token = String(req.headers["x-session-token"]);
  }

  if (token) {
    const session = db.sessions.find((s) => s.token === token);
    if (session) {
      const user = db.users.find((u) => u.id === session.userId);
      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarColor: user.avatarColor,
          createdAt: user.createdAt,
          role: "admin",
        };
      }
    }
  }

  // Universal administrator privileges: all visitors have full admin rights
  const defaultAdmin = db.users.find((u) => u.id === "user-1-lead" || u.id === "user-admin-main") || db.users[0];
  return {
    id: defaultAdmin?.id || "user-1-lead",
    email: defaultAdmin?.email || "admin@detector.ru",
    name: defaultAdmin?.name || "Администратор",
    avatarColor: defaultAdmin?.avatarColor || "#6366f1",
    createdAt: defaultAdmin?.createdAt || new Date().toISOString(),
    role: "admin",
  };
}

// Helper to check if user has admin privileges - always true for everyone
function isUserAdmin(_user: User | null): boolean {
  return true;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "20mb" }));

  // --- API Routes ---

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth: Login - Universal Administrator Access without password requirement
  app.post("/api/auth/login", (req, res) => {
    const { name, email } = req.body;

    // Find or create admin user
    let adminUser = db.users.find((u) => u.id === "user-admin-main" || u.id === "user-1-lead");
    if (!adminUser) {
      adminUser = {
        id: "user-admin-main",
        email: email ? String(email).trim().toLowerCase() : "admin@detector.local",
        name: name ? String(name).trim() : "Администратор",
        avatarColor: "#6366f1",
        createdAt: new Date().toISOString(),
        passwordHash: "",
        role: "admin",
      };
      db.users.push(adminUser);
    } else {
      adminUser.role = "admin";
      if (name && String(name).trim()) {
        adminUser.name = String(name).trim();
      }
    }

    const token = crypto.randomUUID();
    db.sessions.push({
      token,
      userId: adminUser.id,
      createdAt: new Date().toISOString(),
    });
    saveDB(db);

    res.json({
      token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        avatarColor: adminUser.avatarColor,
        createdAt: adminUser.createdAt,
        role: "admin",
      },
    });
  });

  // Auth: Me
  app.get("/api/auth/me", (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Не авторизован" });
    }
    res.json({ user });
  });

  // Auth: Logout
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      db.sessions = db.sessions.filter((s) => s.token !== token);
      saveDB(db);
    }
    res.json({ success: true });
  });

  // Auth: Update Profile
  app.put("/api/auth/profile", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const { name, password } = req.body;
    const dbUser = db.users.find((u) => u.id === user.id);
    if (!dbUser) return res.status(404).json({ error: "Пользователь не найден" });

    if (name) dbUser.name = String(name).trim();
    if (password) dbUser.passwordHash = String(password);

    saveDB(db);
    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        avatarColor: dbUser.avatarColor,
        createdAt: dbUser.createdAt,
      },
    });
  });

  // Auth: Create Invite (Only authenticated users / owners / editors can invite)
  app.post("/api/auth/invite", (req, res) => {
    const currentUser = getAuthUser(req);
    if (!currentUser) return res.status(401).json({ error: "Не авторизован" });

    const { email, presentationId, role = "edit" } = req.body;
    const normalizedEmail = email ? String(email).trim().toLowerCase() : "*";

    if (presentationId) {
      const pres = db.presentations.find((p) => p.id === presentationId);
      if (pres) {
        const isOwner = pres.ownerId === currentUser.id;
        const isEditor = pres.sharedWith.some(
          (s) => s.userId === currentUser.id && s.role === "edit"
        );
        const isSystemLead = currentUser.id === "user-1-lead";

        if (!isOwner && !isEditor && !isSystemLead && pres.id !== "pres-demo-1") {
          return res.status(403).json({ error: "Недостаточно прав для приглашения в презентацию" });
        }

        // If specific email given and user already exists, assign directly
        if (normalizedEmail !== "*") {
          const existingUser = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
          if (existingUser) {
            const alreadyShared = pres.sharedWith.find((s) => s.userId === existingUser.id);
            if (alreadyShared) {
              alreadyShared.role = role;
            } else {
              pres.sharedWith.push({
                userId: existingUser.id,
                userEmail: existingUser.email,
                userName: existingUser.name,
                role,
                invitedAt: new Date().toISOString(),
              });
            }
            saveDB(db);
            return res.json({
              status: "granted_existing_user",
              message: `Доступ успешно предоставлен пользователю ${existingUser.name} (${existingUser.email})`,
              user: existingUser,
            });
          }
        }
      }
    }

    // Otherwise create pending invite code
    const code = "INV-" + crypto.randomUUID().slice(0, 6).toUpperCase();
    const newInvite: UserInvite = {
      id: "inv-" + crypto.randomUUID().slice(0, 8),
      email: normalizedEmail,
      invitedByUserId: currentUser.id,
      invitedByUserName: currentUser.name,
      presentationId,
      role,
      code,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    db.invites.push(newInvite);
    saveDB(db);

    res.json({
      status: "invite_created",
      message: normalizedEmail === "*" 
        ? "Ссылка-приглашение создана. Скопируйте её и отправьте коллеге."
        : `Приглашение создано для ${normalizedEmail}. Скопируйте ссылку и передайте коллеге.`,
      invite: newInvite,
    });
  });

  // Auth: Get public info about an invite code
  app.get("/api/auth/invite-info", (req, res) => {
    const code = String(req.query.code || "").trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ error: "Укажите код приглашения" });
    }

    const invite = db.invites.find((inv) => inv.code.toUpperCase() === code);
    if (!invite) {
      return res.status(404).json({ error: "Приглашение не найдено или истекло", valid: false });
    }

    let presentationTitle = "";
    if (invite.presentationId) {
      const pres = db.presentations.find((p) => p.id === invite.presentationId);
      if (pres) presentationTitle = pres.title;
    }

    res.json({
      valid: true,
      status: invite.status,
      code: invite.code,
      email: invite.email === "*" ? "" : invite.email,
      role: invite.role,
      invitedByUserName: invite.invitedByUserName,
      presentationId: invite.presentationId,
      presentationTitle,
    });
  });

  // Auth: Accept invite by logged-in user
  app.post("/api/auth/accept-invite", (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Войдите в систему, чтобы принять приглашение" });
    }

    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: "Укажите код приглашения" });
    }

    const code = String(inviteCode).trim().toUpperCase();
    const invite = db.invites.find((inv) => inv.code.toUpperCase() === code);

    if (!invite) {
      return res.status(404).json({ error: "Приглашение не найдено или недействительно" });
    }

    invite.status = "accepted";
    invite.acceptedAt = new Date().toISOString();

    let presentation: Presentation | null = null;
    if (invite.presentationId) {
      const pres = db.presentations.find((p) => p.id === invite.presentationId);
      if (pres) {
        presentation = pres;
        const alreadyShared = pres.sharedWith.find((s) => s.userId === user.id);
        if (alreadyShared) {
          alreadyShared.role = invite.role;
        } else if (pres.ownerId !== user.id) {
          pres.sharedWith.push({
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            role: invite.role,
            invitedAt: new Date().toISOString(),
          });
        }
      }
    }

    saveDB(db);
    res.json({
      success: true,
      message: "Приглашение успешно принято",
      presentation,
      role: invite.role,
    });
  });

  // Get active invites
  app.get("/api/auth/invites", (req, res) => {
    const currentUser = getAuthUser(req);
    if (!currentUser) return res.status(401).json({ error: "Не авторизован" });

    const userInvites = db.invites.filter(
      (inv) => inv.invitedByUserId === currentUser.id
    );
    res.json({ invites: userInvites });
  });

  // Presentation list: Own, Shared, Trash
  app.get("/api/presentations", (req, res) => {
    const user = getAuthUser(req);
    const showTrash = req.query.trash === "true";
    const tab = req.query.tab as string;

    const isLeadOrAdmin = user && (user.id === "user-1-lead" || user.email === "hr_lead@detector.ru");

    const filtered = db.presentations.filter((p) => {
      const isDeleted = Boolean(p.isDeleted);

      if (showTrash || tab === "trash") {
        return (isLeadOrAdmin || (user && p.ownerId === user.id)) && isDeleted;
      }
      if (isDeleted) return false;

      if (tab === "my") {
        return user ? p.ownerId === user.id : true;
      }
      if (tab === "shared") {
        return user ? p.sharedWith.some((s) => s.userId === user.id) : false;
      }

      // Default: show all active presentations so presenters can conduct games and view them
      return true;
    });

    res.json({ presentations: filtered });
  });

  // Get single presentation (Owner, Shared, Public Guest, or Invite)
  app.get("/api/presentations/:id", (req, res) => {
    const presId = req.params.id;
    const pres = db.presentations.find((p) => p.id === presId || p.publicShareId === presId);

    if (!pres) {
      return res.status(404).json({ error: "Презентация не найдена" });
    }

    const user = getAuthUser(req);
    const inviteParam = (req.query.invite as string | undefined)?.trim().toUpperCase();

    // Check if valid invite code matches this presentation
    let hasValidInvite = false;
    let inviteRole: "edit" | "view" = "edit";
    if (inviteParam) {
      const matchedInvite = db.invites.find(
        (inv) => inv.code.toUpperCase() === inviteParam && (inv.presentationId === pres.id || !inv.presentationId)
      );
      if (matchedInvite) {
        hasValidInvite = true;
        inviteRole = matchedInvite.role;
        // If user logged in, auto-link to presentation
        if (user && pres.ownerId !== user.id && !pres.sharedWith.some((s) => s.userId === user.id)) {
          pres.sharedWith.push({
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            role: inviteRole,
            invitedAt: new Date().toISOString(),
          });
          matchedInvite.status = "accepted";
          matchedInvite.acceptedAt = new Date().toISOString();
          saveDB(db);
        }
      }
    }

    const isLeadOrAdmin = isUserAdmin(user);
    const isOwner = user && pres.ownerId === user.id;
    const sharedEntry = user ? pres.sharedWith.find((s) => s.userId === user.id) : undefined;

    let access: "owner" | "edit" | "view" = "view";
    if (isLeadOrAdmin || isOwner) {
      access = "owner";
    } else if (sharedEntry) {
      access = sharedEntry.role;
    } else if (hasValidInvite) {
      access = inviteRole;
    }

    res.json({ presentation: pres, access, isGuest: !user });
  });

  // Create presentation
  app.post("/api/presentations", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const { title, description, initialSlideType } = req.body;
    const presId = "pres-" + crypto.randomUUID().slice(0, 8);

    const initialSlides: Slide[] = [];
    if (initialSlideType === "static" || !initialSlideType) {
      initialSlides.push({
        id: "slide-" + crypto.randomUUID().slice(0, 8),
        presentationId: presId,
        type: "static",
        title: "Вводный слайд",
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: {
          title: title || "Новая презентация",
          caption: "Описание темы или инструкции для участников игры.",
          themeStyle: "slate",
        } as StaticSlideContent,
      });
    }

    const newPres: Presentation = {
      id: presId,
      ownerId: user.id,
      ownerEmail: user.email,
      ownerName: user.name,
      title: title?.trim() || "Без названия",
      description: description?.trim() || "",
      slides: initialSlides,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sharedWith: [],
      isPublic: false,
      publicShareId: "share-" + crypto.randomUUID().slice(0, 8),
      isDeleted: false,
    };

    db.presentations.unshift(newPres);
    saveDB(db);

    res.status(201).json({ presentation: newPres });
  });

  // Update presentation (title, description, slides, etc.)
  app.put("/api/presentations/:id", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const presId = req.params.id;
    const pres = db.presentations.find((p) => p.id === presId);
    if (!pres) return res.status(404).json({ error: "Презентация не найдена" });

    const isLeadOrAdmin = isUserAdmin(user);
    const isOwner = pres.ownerId === user.id;
    const isEditor = pres.sharedWith.some(
      (s) => s.userId === user.id && s.role === "edit"
    );

    if (!isLeadOrAdmin && !isOwner && !isEditor) {
      return res.status(403).json({
        error: "Редактирование защищено. Чтобы вносить изменения, войдите под учетной записью администратора.",
      });
    }

    const { title, description, slides } = req.body;
    if (title !== undefined) pres.title = String(title).trim();
    if (description !== undefined) pres.description = String(description).trim();
    if (slides !== undefined && Array.isArray(slides)) {
      pres.slides = slides;
    }
    pres.updatedAt = new Date().toISOString();

    saveDB(db);
    res.json({ presentation: pres });
  });

  // Duplicate presentation
  app.post("/api/presentations/:id/duplicate", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const pres = db.presentations.find((p) => p.id === req.params.id);
    if (!pres) return res.status(404).json({ error: "Презентация не найдена" });

    const newPresId = "pres-" + crypto.randomUUID().slice(0, 8);
    const clonedSlides = pres.slides.map((s, idx) => ({
      ...s,
      id: "slide-" + crypto.randomUUID().slice(0, 8),
      presentationId: newPresId,
      order: idx,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const duplicated: Presentation = {
      ...pres,
      id: newPresId,
      ownerId: user.id,
      ownerEmail: user.email,
      ownerName: user.name,
      title: `${pres.title} (Копия)`,
      slides: clonedSlides,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sharedWith: [],
      isPublic: false,
      publicShareId: "share-" + crypto.randomUUID().slice(0, 8),
      isDeleted: false,
    };

    db.presentations.unshift(duplicated);
    saveDB(db);
    res.json({ presentation: duplicated });
  });

  // Soft delete / Move to trash
  app.delete("/api/presentations/:id", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const pres = db.presentations.find((p) => p.id === req.params.id);
    if (!pres) return res.status(404).json({ error: "Презентация не найдена" });

    const isLeadOrAdmin = isUserAdmin(user);
    if (pres.ownerId !== user.id && !isLeadOrAdmin) {
      return res.status(403).json({ error: "Только владелец или администратор может удалить презентацию" });
    }

    const permanent = req.query.permanent === "true";
    if (permanent) {
      db.presentations = db.presentations.filter((p) => p.id !== req.params.id);
    } else {
      pres.isDeleted = true;
      pres.deletedAt = new Date().toISOString();
    }

    saveDB(db);
    res.json({ success: true, permanent });
  });

  // Restore from trash
  app.post("/api/presentations/:id/restore", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const pres = db.presentations.find((p) => p.id === req.params.id);
    if (!pres) return res.status(404).json({ error: "Презентация не найдена" });

    const isLeadOrAdmin = isUserAdmin(user);
    if (pres.ownerId !== user.id && !isLeadOrAdmin) {
      return res.status(403).json({ error: "Только владелец или администратор может восстановить презентацию" });
    }

    pres.isDeleted = false;
    pres.deletedAt = null;
    saveDB(db);
    res.json({ presentation: pres });
  });

  // Share management: toggle public link, revoke user, change role
  app.post("/api/presentations/:id/share", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const pres = db.presentations.find((p) => p.id === req.params.id);
    if (!pres) return res.status(404).json({ error: "Презентация не найдена" });

    const isOwner = pres.ownerId === user.id;
    const isEditor = pres.sharedWith.some(
      (s) => s.userId === user.id && s.role === "edit"
    );
    const isSystemLead = isUserAdmin(user);

    if (!isOwner && !isEditor && !isSystemLead && pres.id !== "pres-demo-1") {
      return res.status(403).json({ error: "Только владелец или администратор управляет доступом" });
    }

    const { action, targetUserId, newRole, isPublic } = req.body;

    if (action === "revoke" && targetUserId) {
      pres.sharedWith = pres.sharedWith.filter((s) => s.userId !== targetUserId);
    } else if (action === "change_role" && targetUserId && newRole) {
      const entry = pres.sharedWith.find((s) => s.userId === targetUserId);
      if (entry) entry.role = newRole;
    } else if (action === "toggle_public") {
      pres.isPublic = Boolean(isPublic);
      if (pres.isPublic && !pres.publicShareId) {
        pres.publicShareId = "share-" + crypto.randomUUID().slice(0, 8);
      }
    }

    pres.updatedAt = new Date().toISOString();
    saveDB(db);
    res.json({ presentation: pres });
  });

  // Library / Slide Bank: Get user's library slides
  app.get("/api/library", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const userSlides = db.librarySlides.filter(
      (s) => s.ownerId === user.id || s.ownerId === "user-1-lead" // include system pre-seeded
    );
    res.json({ slides: userSlides });
  });

  // Library: Save a slide to bank
  app.post("/api/library", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const { type, title, content, tags } = req.body;
    if (!type || !title || !content) {
      return res.status(400).json({ error: "Не все поля заполнены" });
    }

    const newLibSlide: LibrarySlide = {
      id: "lib-" + crypto.randomUUID().slice(0, 8),
      ownerId: user.id,
      ownerName: user.name,
      type,
      title: String(title).trim(),
      content,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.librarySlides.unshift(newLibSlide);
    saveDB(db);
    res.status(201).json({ slide: newLibSlide });
  });

  // Library: Update slide in bank
  app.put("/api/library/:id", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const slide = db.librarySlides.find((s) => s.id === req.params.id);
    if (!slide) return res.status(404).json({ error: "Слайд не найден в банке" });

    if (slide.ownerId !== user.id && slide.ownerId !== "user-1-lead") {
      return res.status(403).json({ error: "Нет прав на редактирование этого слайда" });
    }

    const { title, content, tags } = req.body;
    if (title) slide.title = String(title).trim();
    if (content) slide.content = content;
    if (tags) slide.tags = tags;
    slide.updatedAt = new Date().toISOString();

    saveDB(db);
    res.json({ slide });
  });

  // Library: Delete slide from bank
  app.delete("/api/library/:id", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const slideIndex = db.librarySlides.findIndex((s) => s.id === req.params.id);
    if (slideIndex === -1) return res.status(404).json({ error: "Слайд не найден" });

    const slide = db.librarySlides[slideIndex];
    if (slide.ownerId !== user.id && slide.ownerId !== "user-1-lead") {
      return res.status(403).json({ error: "Нет прав на удаление" });
    }

    db.librarySlides.splice(slideIndex, 1);
    saveDB(db);
    res.json({ success: true });
  });

  // Export presentation to JSON
  app.get("/api/export/presentation/:id", (req, res) => {
    const pres = db.presentations.find((p) => p.id === req.params.id);
    if (!pres) return res.status(404).json({ error: "Презентация не найдена" });

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(pres.title)}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(pres, null, 2));
  });

  // Import presentation from JSON
  app.post("/api/import/presentation", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const data = req.body;
    if (!data || !data.title || !Array.isArray(data.slides)) {
      return res.status(400).json({ error: "Неверный формат JSON презентации" });
    }

    const newPresId = "pres-" + crypto.randomUUID().slice(0, 8);
    const newSlides = data.slides.map((s: any, idx: number) => ({
      ...s,
      id: "slide-" + crypto.randomUUID().slice(0, 8),
      presentationId: newPresId,
      order: idx,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const importedPres: Presentation = {
      id: newPresId,
      ownerId: user.id,
      ownerEmail: user.email,
      ownerName: user.name,
      title: `${data.title} (Импорт)`,
      description: data.description || "",
      slides: newSlides,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sharedWith: [],
      isPublic: false,
      publicShareId: "share-" + crypto.randomUUID().slice(0, 8),
      isDeleted: false,
    };

    db.presentations.unshift(importedPres);
    saveDB(db);
    res.status(201).json({ presentation: importedPres });
  });

  // Export slide bank to JSON
  app.get("/api/export/library", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const userSlides = db.librarySlides.filter(
      (s) => s.ownerId === user.id || s.ownerId === "user-1-lead"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="competency-slide-bank.json"');
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(userSlides, null, 2));
  });

  // Import slide bank from JSON
  app.post("/api/import/library", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Не авторизован" });

    const slides = req.body;
    if (!Array.isArray(slides)) {
      return res.status(400).json({ error: "Ожидался массив слайдов" });
    }

    let importedCount = 0;
    for (const item of slides) {
      if (item.title && item.type && item.content) {
        db.librarySlides.push({
          id: "lib-" + crypto.randomUUID().slice(0, 8),
          ownerId: user.id,
          ownerName: user.name,
          type: item.type,
          title: String(item.title),
          content: item.content,
          tags: Array.isArray(item.tags) ? item.tags : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        importedCount++;
      }
    }

    saveDB(db);
    res.json({ success: true, count: importedCount });
  });

  // Direct download endpoints for developer handover / backups
  app.get("/api/download/project.zip", (_req, res) => {
    const zipPath = path.join(process.cwd(), "public", "downloads", "competency-detector-project.zip");
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, "competency-detector-project.zip");
    } else {
      res.status(404).json({ error: "Архив не найден" });
    }
  });

  app.get("/api/download/project.tar.gz", (_req, res) => {
    const tarPath = path.join(process.cwd(), "public", "downloads", "competency-detector-project.tar.gz");
    if (fs.existsSync(tarPath)) {
      res.download(tarPath, "competency-detector-project.tar.gz");
    } else {
      res.status(404).json({ error: "Архив не найден" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
