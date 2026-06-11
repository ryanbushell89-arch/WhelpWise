import { useParams } from "wouter";
import { useGetDog } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DogForm, dogToFormValues } from "./_form";

export default function EditDog() {
  const { id } = useParams<{ id: string }>();
  const dogId = parseInt(id);
  const { data: dog, isLoading } = useGetDog(dogId);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!dog) return null;

  return <DogForm mode="edit" dogId={dogId} initialValues={dogToFormValues(dog)} />;
}
