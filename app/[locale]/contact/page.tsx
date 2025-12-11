"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Mail, MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      setIsSuccess(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setError("Failed to send message. Please try again or email us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Message Sent!
          </h2>
          <p className="text-muted-foreground mb-6">
            Thank you for contacting us. We'll get back to you within 24 hours.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => setIsSuccess(false)}>
              Send Another Message
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">Contact Us</h1>
          <p className="text-muted-foreground">
            Have a question? We're here to help.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Send us a message</h2>
                <p className="text-muted-foreground">
                  Fill out the form below and we'll get back to you as soon as possible.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="you@example.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="How can we help?"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Tell us more about your inquiry..."
                    required
                    disabled={isSubmitting}
                    rows={6}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Get in touch</h2>
                <p className="text-muted-foreground mb-6">
                  We're always happy to hear from you. Whether you have a question about features,
                  pricing, or anything else, our team is ready to answer your questions.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Email</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      For general inquiries
                    </p>
                    <a href="mailto:support@unytea.com" className="text-sm text-primary hover:underline">
                      support@unytea.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Support</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      Technical support and help
                    </p>
                    <a href="mailto:support@unytea.com" className="text-sm text-primary hover:underline">
                      support@unytea.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card/50 p-6">
                <h3 className="font-semibold text-foreground mb-3">Response Time</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Email: Within 24 hours
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Support: Within 48 hours
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Business hours: Mon-Fri, 9am-6pm EST
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
