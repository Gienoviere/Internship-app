            </main>
        </div>
    </div>

    <!-- Bootstrap JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        // Actieve sidebar link highlight
        document.addEventListener('DOMContentLoaded', function() {
            const currentPage = '<?php echo $current_page; ?>';
            const navLinks = document.querySelectorAll('.sidebar .nav-link');
            
            navLinks.forEach(link => {
                if (link.getAttribute('href').includes(currentPage)) {
                    link.classList.add('active');
                }
            });
            
            // Toggle sidebar on mobile
            const sidebar = document.getElementById('sidebarMenu');
            if (window.innerWidth < 768) {
                sidebar.classList.remove('show');
            }
        });
        
        // Voorbeeld van taak voltooi functie
        function completeTask(taskId) {
            const taskCard = document.getElementById('task-' + taskId);
            taskCard.classList.add('task-completed');
            taskCard.innerHTML = '<div class="alert alert-success mb-0"><i class="bi bi-check-circle-fill me-2"></i>Taak voltooid!</div>';
            
            // Update badge in sidebar
            const taskBadge = document.querySelector('a[href="tasks.php"] .badge');
            if (taskBadge) {
                const currentCount = parseInt(taskBadge.textContent);
                if (currentCount > 0) {
                    taskBadge.textContent = currentCount - 1;
                    if (currentCount - 1 === 0) {
                        taskBadge.classList.remove('badge-alert');
                        taskBadge.classList.add('bg-secondary');
                    }
                }
            }
        }
    </script>
</body>
</html>