import { supabase } from "@/lib/supabase";

export default async function Home() {
    const { data: todos, error } = await supabase
        .from("todos")
        .select("*");

    return (
        <main className="p-8">
            <h1 className="text-4xl font-bold mb-8">Hello World</h1>

            <h2 className="text-2xl font-semibold mb-4">Todos</h2>

            {error ? (
                <p className="text-red-500">
                    Error loading todos: {error.message}
                </p>
            ) : (
                <ul className="space-y-3">
                    {todos?.map((todo) => (
                        <li
                            key={todo.id}
                            className="border rounded-lg p-4"
                        >
                            <p className="font-medium">{todo.title}</p>
                            <p className="text-sm text-gray-500">
                                {todo.completed ? "Completed" : "Not completed"}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}