"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateCourse } from "@/app/actions/courses";
import { toast } from "sonner";
import { Save, DollarSign, Image as ImageIcon } from "lucide-react";

interface CourseSettingsProps {
  course: any;
}

export function CourseSettings({ course }: CourseSettingsProps) {
  const [formData, setFormData] = useState({
    title: course.title || "",
    description: course.description || "",
    imageUrl: course.imageUrl || "",
    isPaid: course.isPaid || false,
    price: course.price || 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Course title is required");
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateCourse(course.id, {
        title: formData.title,
        description: formData.description,
        imageUrl: formData.imageUrl,
        isPaid: formData.isPaid,
        price: formData.isPaid ? formData.price : 0,
      });

      if (result.success) {
        toast.success("Course settings updated successfully! 🎉");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(result.error || "Failed to update course");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Basic Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Course Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Unytea Academy - Complete Guide"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What will students learn in this course?"
              rows={5}
            />
          </div>

          <div>
            <Label htmlFor="imageUrl">Thumbnail Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
              <Button variant="outline" size="icon" title="Upload image">
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
            {formData.imageUrl && (
              <div className="mt-2">
                <img 
                  src={formData.imageUrl} 
                  alt="Preview" 
                  className="w-full max-w-md h-48 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Pricing */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pricing
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
            <div className="space-y-0.5">
              <Label htmlFor="isPaid">Paid Course</Label>
              <p className="text-xs text-muted-foreground">
                Require payment to access this course
              </p>
            </div>
            <Switch
              id="isPaid"
              checked={formData.isPaid}
              onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
            />
          </div>

          {formData.isPaid && (
            <div>
              <Label htmlFor="price">Price (USD) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="pl-7"
                  placeholder="97.00"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          size="lg"
          className="bg-gradient-to-r from-primary to-purple-600"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
