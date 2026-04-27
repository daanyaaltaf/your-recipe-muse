// Edge function: Generate recipe (structured JSON) + dish image using Lovable AI

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  ingredients: string;
  diet: string;
  cuisine: string;
  servings: number;
  avoidTitle?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    const { ingredients, diet, cuisine, servings, avoidTitle } = body;

    if (!ingredients || !cuisine || !servings) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a world-class chef and recipe writer. Create authentic, delicious recipes tailored to the user's ingredients, dietary preference, cuisine and serving count. Be precise with measurements and clear with steps.`;

    const userPrompt = `Create a single recipe with these constraints:
- Available ingredients (use mainly these, but you may add common pantry staples): ${ingredients}
- Dietary preference: ${diet || "no restrictions"}
- Cuisine: ${cuisine}
- Servings: ${servings}
${avoidTitle ? `- Do NOT suggest "${avoidTitle}". Propose a different dish.` : ""}

Return the recipe via the provided tool.`;

    // 1) Generate structured recipe via tool calling
    const recipeRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_recipe",
              description: "Return a structured recipe.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Dish name" },
                  description: { type: "string", description: "1-2 sentence enticing description" },
                  prepTime: { type: "string", description: "e.g. 15 minutes" },
                  cookTime: { type: "string", description: "e.g. 30 minutes" },
                  servings: { type: "number" },
                  difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
                  ingredients: {
                    type: "array",
                    items: { type: "string" },
                    description: "Each item with measurement, e.g. '2 cups flour'",
                  },
                  steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Numbered cooking steps",
                  },
                  youtubeQuery: {
                    type: "string",
                    description: "Best YouTube search query to find a tutorial for this exact dish",
                  },
                  imagePrompt: {
                    type: "string",
                    description: "Detailed photographic prompt of the finished plated dish for an image model",
                  },
                },
                required: [
                  "title", "description", "prepTime", "cookTime", "servings",
                  "difficulty", "ingredients", "steps", "youtubeQuery", "imagePrompt",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_recipe" } },
      }),
    });

    if (!recipeRes.ok) {
      const t = await recipeRes.text();
      console.error("Recipe AI error", recipeRes.status, t);
      if (recipeRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (recipeRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to generate recipe" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipeData = await recipeRes.json();
    const toolCall = recipeData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call returned", JSON.stringify(recipeData));
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipe = JSON.parse(toolCall.function.arguments);

    // 2) Generate dish image
    let imageUrl: string | null = null;
    try {
      const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: `Professional food photography, overhead or 45-degree angle, natural light, shallow depth of field, restaurant-quality plating: ${recipe.imagePrompt}`,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
      } else {
        console.error("Image gen failed", imgRes.status, await imgRes.text());
      }
    } catch (e) {
      console.error("Image gen error", e);
    }

    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      recipe.youtubeQuery + " recipe"
    )}`;

    return new Response(
      JSON.stringify({ recipe, imageUrl, youtubeUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-recipe error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
