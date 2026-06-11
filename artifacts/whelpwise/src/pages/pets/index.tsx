import { Link } from "wouter";
import { useListPets } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { speciesLabel, speciesEmoji } from "./_form";

export default function FamilyPetsDirectory() {
  const { data: pets, isLoading } = useListPets();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground">Family Pets</h1>
          <p className="text-muted-foreground mt-1">Pets that are part of your family, outside the breeding programme.</p>
        </div>
        <Button asChild>
          <Link href="/pets/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Pet
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : pets && (pets as any[]).length > 0 ? (
          (pets as any[]).map((pet) => (
            <Card key={pet.id} className="overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
              <div className="h-40 bg-muted relative flex items-center justify-center overflow-hidden">
                {pet.photoUrl ? (
                  <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl opacity-60">{speciesEmoji(pet.species)}</span>
                )}
                {pet.status === "deceased" && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Badge variant="secondary" className="bg-white/80">Deceased</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4 flex-1">
                <h3 className="font-bold text-lg truncate">{pet.name}</h3>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs capitalize">
                    {speciesLabel(pet.species)}
                  </Badge>
                  {pet.sex && (
                    <Badge variant={pet.sex === "male" ? "default" : "secondary"} className="text-xs capitalize">
                      {pet.sex}
                    </Badge>
                  )}
                </div>
                {(pet.breed || pet.dob) && (
                  <div className="mt-3 text-sm space-y-0.5">
                    {pet.breed && <p className="text-muted-foreground truncate">{pet.breed}</p>}
                    {pet.dob && (
                      <p className="text-muted-foreground">
                        Born {new Date(pet.dob).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button variant="secondary" className="w-full" asChild>
                  <Link href={`/pets/${pet.id}`}>View Records</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center border rounded-lg border-dashed">
            <span className="text-5xl block mb-4">🐾</span>
            <h3 className="text-lg font-medium">No family pets yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-1">
              Add pets that live with you but aren't part of your breeding programme.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/pets/new">Add Your First Pet</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
