import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  endpointId: string;
  apiKey?: string | null;
  children: React.ReactNode;
}

const LANGUAGES = ["cURL", "JavaScript", "Python", "Go"] as const;
type Language = (typeof LANGUAGES)[number];

function generateSnippet(
  language: Language,
  url: string,
  apiKey?: string | null
): string {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["x-api-key"] = apiKey;

  const sampleBody = JSON.stringify(
    { event: "order.created", data: { id: 123, amount: 49.99 } },
    null,
    2
  );

  switch (language) {
    case "cURL": {
      const headerFlags = Object.entries(headers)
        .map(([k, v]) => `  -H "${k}: ${v}"`)
        .join(" \\\n");
      return `curl -X POST \\\n  "${url}" \\\n${headerFlags} \\\n  -d '${sampleBody}'`;
    }
    case "JavaScript": {
      return `const response = await fetch("${url}", {
  method: "POST",
  headers: ${JSON.stringify(headers, null, 4)},
  body: JSON.stringify(${sampleBody})
});

const data = await response.json();
console.log(data);`;
    }
    case "Python": {
      const hdr = Object.entries(headers)
        .map(([k, v]) => `    "${k}": "${v}"`)
        .join(",\n");
      return `import requests

response = requests.post(
    "${url}",
    headers={\n${hdr}\n    },
    json=${sampleBody.replace(/null/g, "None").replace(/true/g, "True").replace(/false/g, "False")}
)

print(response.json())`;
    }
    case "Go": {
      const hLines = Object.entries(headers)
        .map(([k, v]) => `\treq.Header.Set("${k}", "${v}")`)
        .join("\n");
      return `package main

import (
\t"bytes"
\t"encoding/json"
\t"fmt"
\t"net/http"
\t"io"
)

func main() {
\tbody := map[string]interface{}{
\t\t"event": "order.created",
\t\t"data": map[string]interface{}{
\t\t\t"id":     123,
\t\t\t"amount": 49.99,
\t\t},
\t}
\tjsonBody, _ := json.Marshal(body)

\treq, _ := http.NewRequest("POST", "${url}", bytes.NewBuffer(jsonBody))
${hLines}

\tclient := &http.Client{}
\tresp, err := client.Do(req)
\tif err != nil {
\t\tfmt.Println("Error:", err)
\t\treturn
\t}
\tdefer resp.Body.Close()

\tresBody, _ := io.ReadAll(resp.Body)
\tfmt.Println(string(resBody))
}`;
    }
  }
}

export function CodeSnippets({ endpointId, apiKey, children }: Props) {
  const [copiedLang, setCopiedLang] = useState<Language | null>(null);
  const { toast } = useToast();
  const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-capture/${endpointId}`;

  const handleCopy = (lang: Language) => {
    const snippet = generateSnippet(lang, url, apiKey);
    navigator.clipboard.writeText(snippet);
    setCopiedLang(lang);
    toast({ title: "Copied!", description: `${lang} snippet copied to clipboard` });
    setTimeout(() => setCopiedLang(null), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Code Snippets
            <Badge variant="outline" className="font-mono text-xs">
              {endpointId}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="cURL" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            {LANGUAGES.map((lang) => (
              <TabsTrigger key={lang} value={lang} className="text-xs">
                {lang}
              </TabsTrigger>
            ))}
          </TabsList>

          {LANGUAGES.map((lang) => (
            <TabsContent key={lang} value={lang} className="mt-3">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-8 gap-1.5 text-xs z-10"
                  onClick={() => handleCopy(lang)}
                >
                  {copiedLang === lang ? (
                    <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copied</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy</>
                  )}
                </Button>
                <pre className="bg-muted rounded-lg p-4 pr-24 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {generateSnippet(lang, url, apiKey)}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Replace the sample payload with your actual data.
                {apiKey && " Your API key is pre-filled in the snippet."}
              </p>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
