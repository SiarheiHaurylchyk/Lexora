# 📋 README — Правила использования RHF + Zod + zodResolver

# ❗ Обязательные правила

## 1️. Валидация через Zod

Вся логика валидации должна находиться исключительно в Zod-схеме.

`import { z } from "zod"`

---

## Запрещено:

- использовать required в register

- писать inline-валидаторы

- делать проверки внутри onSubmit

- добавлять ручные проверки (if (!value))

- дублировать логику валидации

Пример правильной схемы:

```ts
const schema = z.object({
  email: z.email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});
```

Все сообщения об ошибках должны быть определены внутри схемы.

---

## 2. Обязательно использовать zodResolver

Форма должна быть подключена через zodResolver.

```ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

type FormValues = z.infer<typeof schema>;
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormValues>({
  resolver: zodResolver(schema),
});
```

---

## Использовать только handleSubmit

Запрещено писать кастомный `onSubmit с preventDefault`.

**Неправильно:**

```ts
import type { FormEvent } from 'react';

const onSubmit = (e: FormEvent) => {
  e.preventDefault();
};
```

Правильно:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function ExampleForm() {
  const { handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormValues) => {
    console.log(data);
  };

  return <form onSubmit={handleSubmit(onSubmit)} />;
}
```

---

## Типизация только через z.infer

Типы формы должны выводиться из схемы.

`type FormValues = z.infer<typeof schema>`

## Структура slice

```text
slice/
├── model/
│   └── ExampleForm.schema.ts
└── ui/
    └── ExampleForm.tsx
```
