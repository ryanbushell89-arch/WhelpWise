import { useState, useEffect } from "react";
import { useListDogs } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Dog as DogIcon } from "lucide-react";
import { Link } from "wouter";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function DogsDirectory() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data: dogs, isLoading } = useListDogs(
    debouncedSearch ? { search: debouncedSearch } : undefined
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground">My Kennel</h1>
          <p className="text-muted-foreground mt-1">Breeding dogs registered in your programme.</p>
        </div>
        <Button asChild>
          <Link href="/dogs/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Dog
          </Link>
        </Button>
      </div>

      <div className="flex gap-2 items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, breed..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array(8).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full rounded-none" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))
        ) : dogs && dogs.length > 0 ? (
          dogs.map((dog) => (
            <Card key={dog.id} className="overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
              <div className="h-48 bg-muted relative">
                {dog.photoUrl ? (
                  <img src={dog.photoUrl} alt={dog.callName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <DogIcon className="h-12 w-12 opacity-20" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={dog.sex === 'male' ? 'default' : 'secondary'} className="capitalize shadow-sm">
                    {dog.sex}
                  </Badge>
                  {dog.status !== 'active' && (
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-sm capitalize shadow-sm">
                      {dog.status}
                    </Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-4 flex-1">
                <h3 className="font-bold text-lg truncate" title={dog.callName}>{dog.callName}</h3>
                <p className="text-sm text-muted-foreground truncate" title={dog.registeredName}>{dog.registeredName || 'No registered name'}</p>
                <div className="mt-4 text-sm grid grid-cols-2 gap-y-1">
                  <div className="text-muted-foreground">Breed:</div>
                  <div className="truncate font-medium" title={dog.breedName || 'Unknown'}>{dog.breedName || 'Unknown'}</div>
                  <div className="text-muted-foreground">DOB:</div>
                  <div className="font-medium">{dog.dob ? new Date(dog.dob).toLocaleDateString() : 'Unknown'}</div>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button variant="secondary" className="w-full" asChild>
                  <Link href={`/dogs/${dog.id}`}>View Profile</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center border rounded-lg border-dashed">
            <DogIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <h3 className="text-lg font-medium">No dogs found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-1">
              {search ? "No dogs match your search criteria." : "You haven't added any dogs to your kennel yet."}
            </p>
            {!search && (
              <Button className="mt-4" asChild>
                <Link href="/dogs/new">Add Your First Dog</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
