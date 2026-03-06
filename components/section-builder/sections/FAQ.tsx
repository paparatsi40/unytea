"use client";

import React, { useState } from "react";
import { SectionSchema } from "../types";
import { ChevronDown } from "lucide-react";

export const FAQRender = (props: Record<string, any>) => {
  const { title, q1, a1, q2, a2, q3, a3, q4, a4, q5, a5 } = props;
  
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  const faqs = [
    { q: q1, a: a1 },
    { q: q2, a: a2 },
    { q: q3, a: a3 },
    { q: q4, a: a4 },
    { q: q5, a: a5 },
  ].filter(faq => faq.q);
  
  return (
    <section className="rounded-2xl border border-border bg-white p-8 md:p-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
            {title || "Frequently Asked Questions"}
          </h2>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-gray-50"
              >
                <span className="text-lg font-semibold text-gray-900">
                  {faq.q}
                </span>
                <ChevronDown 
                  className={`h-5 w-5 text-gray-500 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <p className="text-gray-700">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FAQSchema: SectionSchema = {
  type: "faq",
  label: "FAQ",
  description: "Frequently asked questions with expandable answers",
  icon: "❓",
  defaultProps: {
    title: "Frequently Asked Questions",
    // Empty placeholders - host fills in their own FAQs
    q1: "",
    a1: "",
    q2: "",
    a2: "",
    q3: "",
    a3: "",
    q4: "",
    a4: "",
    q5: "",
    a5: "",
  },
  fields: [
    { key: "title", label: "Title", kind: "text", placeholder: "Frequently Asked Questions" },
    { key: "q1", label: "Question 1", kind: "text", placeholder: "e.g., What is this community about?" },
    { key: "a1", label: "Answer 1", kind: "textarea", placeholder: "Enter your answer here..." },
    { key: "q2", label: "Question 2", kind: "text", placeholder: "e.g., How can I join?" },
    { key: "a2", label: "Answer 2", kind: "textarea", placeholder: "Enter your answer here..." },
    { key: "q3", label: "Question 3", kind: "text", placeholder: "e.g., What are the benefits?" },
    { key: "a3", label: "Answer 3", kind: "textarea", placeholder: "Enter your answer here..." },
    { key: "q4", label: "Question 4", kind: "text", placeholder: "e.g., Is there a cost?" },
    { key: "a4", label: "Answer 4", kind: "textarea", placeholder: "Enter your answer here..." },
    { key: "q5", label: "Question 5", kind: "text", placeholder: "e.g., How do I get started?" },
    { key: "a5", label: "Answer 5", kind: "textarea", placeholder: "Enter your answer here..." },
  ],
  Render: FAQRender,
};
