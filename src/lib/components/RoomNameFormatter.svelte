<script lang="ts">
    export let rawPath: string;
    
    function formatRoomName(path: string): string {
        // Split the path into segments
        const segments = path.split('/');
        
        // Find floor_room segment (e.g. "3_2")
        const floorRoom = segments.find(s => s.match(/^\d+_\d+$/));
        
        // Find the name segment (e.g. "LawrenceLessig")
        const namePart = segments.find(s => s.match(/^[A-Z][a-zA-Z]+$/));
        
        if (!floorRoom || !namePart) return 'Salle non valide';
        
        // Transform floor_room (3_2 -> 3.2)
        const formattedFloor = floorRoom.replace('_', '.');
        
        // Format the name part by adding spaces before capital letters
        const formattedName = namePart.replace(/([A-Z])/g, ' $1').trim();
        
        return `${formattedFloor} - ${formattedName}`;
    }

    $: formattedName = formatRoomName(rawPath);
</script>

<div class="text-gray-800 font-medium">
    {formattedName}
</div>